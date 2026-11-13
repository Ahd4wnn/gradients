import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { TEST_EMAIL_DOMAIN } from "./global-setup";

// Coupon links and codes on the checkout page. No payment is made and no Razorpay order is created:
// the tests stop at the price shown and at requests the server refuses before it would call Razorpay.
let db: pg.Client;

test.beforeAll(async () => {
  process.loadEnvFile(".env.local");
  db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query("delete from coupons where code like 'E2E%'");
  await db.query(
    `insert into coupons (code, percent_off, max_uses, uses, expires_at) values
       ('E2EHALF', 50, 100, 0, now() + interval '1 day'),
       ('E2EOLD', 50, null, 0, now() - interval '1 minute'),
       ('E2EGONE', 50, 3, 3, null)`,
  );
});
test.afterAll(async () => {
  await db.query("delete from users where email like 'e2e-new-%@' || $1", [TEST_EMAIL_DOMAIN]);
  await db.query("delete from coupons where code like 'E2E%'");
  await db.end();
});

/** Fill and send the sign-up form. Retried, because text typed before the page's scripts load is cleared when they do. */
async function submitSignUp(page: Page) {
  const email = `e2e-new-coupon-${Date.now()}-${Math.floor(Math.random() * 1e6)}@${TEST_EMAIL_DOMAIN}`;
  await expect(async () => {
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill("a long enough password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 4000 });
  }).toPass({ timeout: 30_000 });
}
async function signUp(page: Page, next: string) {
  await page.goto(`/signup?next=${encodeURIComponent(next)}`);
  await submitSignUp(page);
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a coupon link survives sign-up and halves the price in both currencies", async ({ page }) => {
    await page.goto("/checkout?code=e2ehalf"); // lower case on purpose
    await expect(page).toHaveURL(/\/signin\?next=/);
    // the sign-in page links to sign-up with the same destination; follow that link's address
    const signUpHref = await page.getByRole("link", { name: "Create an account" }).getAttribute("href");
    expect(signUpHref).toContain(encodeURIComponent("code=e2ehalf"));
    await page.goto(signUpHref!);
    await submitSignUp(page);
    await expect(page).toHaveURL(/\/checkout\?.*code=E2EHALF/i);
    await expect(page.getByText("Code E2EHALF applied: 50% off.")).toBeVisible();
    await page.getByRole("radio", { name: "USD" }).click();
    await expect(page.getByRole("button", { name: "Pay $12.50 and open the studio" })).toBeEnabled();
    await page.getByRole("radio", { name: "INR" }).click();
    await expect(page.getByRole("button", { name: "Pay ₹1,049.50 and open the studio" })).toBeEnabled();
    await expect(page.getByLabel("Coupon code")).toHaveCount(0); // already applied
  });

  test("expired, used-up and unknown codes show the regular price and say why", async ({ page }) => {
    await signUp(page, "/checkout?code=E2EOLD");
    for (const code of ["E2EOLD", "E2EGONE", "NOSUCHCODE", "x'; drop table coupons; --"]) {
      await page.goto(`/checkout?code=${encodeURIComponent(code)}`);
      await expect(page.getByRole("main").getByRole("alert")).toContainText("not valid, has expired, or has been used up");
      await page.getByRole("radio", { name: "USD" }).click();
      await expect(page.getByRole("button", { name: "Pay $25 and open the studio" })).toBeEnabled();
    }
    // typing a good code into the field applies it
    await page.getByLabel("Coupon code").fill("e2ehalf");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Code E2EHALF applied: 50% off.")).toBeVisible();
    expect((await db.query("select count(*)::int as n from coupons where code like 'E2E%'")).rows[0].n).toBe(3); // the table is still there
  });
});

test("the server refuses a dead code before any order is made, and the browser cannot set the price", async ({ request }) => {
  const order = (data: object) => request.post("/api/billing/order", { headers: { Origin: "http://localhost:3000" }, data });
  // two requests only: the route allows ten checkout attempts an hour per account, and repeated test runs share that
  const dead = await order({ currency: "USD", code: "E2EGONE" });
  expect(dead.status()).toBe(400);
  expect((await dead.json()).error).toContain("not valid any more");
  // extra fields are ignored: the paid test account is simply told it already owns the licence, at no price
  const res = await order({ currency: "USD", amount: 1, percentOff: 99 });
  expect(await res.json()).toEqual({ alreadyPaid: true });
  expect((await db.query("select count(*)::int as n from purchases where amount < 1000 and razorpay_order_id not like 'order_E2E%' and razorpay_order_id not like 'grant_%'")).rows[0].n).toBe(0);
});

test("a use is counted once, when the purchase is paid", async () => {
  // the counting statement from billing.ts, run twice the way a webhook and a callback arriving together would
  const user = (await db.query(`insert into users (email) values ('e2e-new-count-${Date.now()}@${TEST_EMAIL_DOMAIN}') returning id`)).rows[0].id;
  const orderId = `order_E2E_COUPON_${Date.now()}`;
  await db.query("insert into purchases (user_id, razorpay_order_id, amount, currency, coupon) values ($1, $2, 1250, 'USD', 'E2EHALF')", [user, orderId]);
  for (let i = 0; i < 2; i++) {
    const { rows } = await db.query("update purchases set status = 'paid', razorpay_payment_id = $2, paid_at = now() where razorpay_order_id = $1 and status <> 'paid' returning coupon", [orderId, `pay_E2E_${Date.now()}`]);
    if (rows[0]?.coupon) await db.query("update coupons set uses = uses + 1 where code = $1", [rows[0].coupon]);
  }
  expect((await db.query("select uses from coupons where code = 'E2EHALF'")).rows[0].uses).toBe(1);
});

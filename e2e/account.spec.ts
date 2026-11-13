import { expect, test } from "@playwright/test";
import pg from "pg";
import { TEST_EMAIL_DOMAIN } from "./global-setup";

// these tests start signed out
test.use({ storageState: { cookies: [], origins: [] } });

test.afterAll(async () => {
  process.loadEnvFile(".env.local");
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query("delete from users where email like 'e2e-new-%@' || $1", [TEST_EMAIL_DOMAIN]);
  await db.end();
});

test("a signed-out visitor is sent to sign in, keeping the gradient they picked", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open Peach Aura in the studio" }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2Fstudio%3Fg%3D/);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});

test("signing up leads to checkout, which shows the price and the payment button", async ({ page }) => {
  await page.goto("/signup?next=/checkout");
  await page.getByLabel(/^Email/).fill(`e2e-new-${Date.now()}@${TEST_EMAIL_DOMAIN}`);
  await page.getByLabel(/^Password/).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Use at least 8 characters.");
  await page.getByLabel(/^Password/).fill("a long enough password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1); // hydrated
  await page.getByRole("radio", { name: "INR" }).click();
  await expect(page.getByRole("button", { name: "Pay ₹2,099 and open the studio" })).toBeEnabled();
  await page.getByRole("radio", { name: "USD" }).click();
  await expect(page.getByRole("button", { name: "Pay $25 and open the studio" })).toBeEnabled();
  // an unpaid account cannot open the studio
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/checkout\?next=%2Fstudio/);
});

test("wrong password is refused without saying which part was wrong", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel(/^Email/).fill(`nobody@${TEST_EMAIL_DOMAIN}`);
  await page.getByLabel(/^Password/).fill("whatever123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("That email and password do not match an account.");
});

test("the pricing section switches currency", async ({ page }) => {
  await page.goto("/#pricing");
  const pricing = page.locator("#pricing");
  await expect(pricing.getByRole("radio", { checked: true })).toHaveCount(1); // hydrated
  await pricing.getByRole("radio", { name: "USD" }).click();
  await expect(pricing.getByText("$25", { exact: true })).toBeVisible();
  await pricing.getByRole("radio", { name: "INR" }).click();
  await expect(pricing.getByText("₹2,099", { exact: true })).toBeVisible();
});

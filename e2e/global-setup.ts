import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import pg from "pg";

export const PAID_STATE = "e2e/.auth/paid.json";
export const TEST_EMAIL_DOMAIN = "gradients.test"; // reserved-style domain: every test account is easy to find and delete

/**
 * The studio is paid-only, so the browser tests run as a paid account. It is created straight in the local database
 * (a purchase row marked paid, with fake Razorpay ids): no payment is made and Razorpay is never called.
 */
export default async function globalSetup() {
  process.loadEnvFile(".env.local");
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ id: string }>(
      `insert into users (email, name) values ('e2e-paid@${TEST_EMAIL_DOMAIN}', 'E2E paid') on conflict (email) do update set name = excluded.name returning id`,
    );
    const id = rows[0].id;
    await db.query(
      "insert into purchases (user_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, paid_at) values ($1, 'order_E2E_TEST', 'pay_E2E_TEST', 2500, 'USD', 'paid', now()) on conflict (razorpay_order_id) do nothing",
      [id],
    );
    await db.query("delete from sessions where user_id = $1", [id]);
    const token = randomBytes(32).toString("base64url");
    await db.query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 day')", [createHash("sha256").update(token).digest("hex"), id]);
    fs.mkdirSync("e2e/.auth", { recursive: true });
    fs.writeFileSync(
      PAID_STATE,
      JSON.stringify({ cookies: [{ name: "gf_session", value: token, domain: "localhost", path: "/", expires: Math.floor(Date.now() / 1000) + 86400, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] }),
    );
  } finally {
    await db.end();
  }
}

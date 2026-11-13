import { createHmac } from "node:crypto";
import { expect, test } from "vitest";
import { guessCurrency, isCurrency, PRICES } from "../pricing";
import { normalizeEmail, emailError, passwordError, safeNext } from "../validate";
import { rateLimited, sameOrigin } from "./guard";
import { hashPassword, verifyPassword } from "./password";
import { checkoutSignatureValid, webhookSignatureValid } from "./razorpay";

test("passwords hash with a fresh salt and verify only the right password", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  expect(a).not.toBe(b);
  expect(a).toMatch(/^scrypt\$16384\$8\$1\$/);
  expect(await verifyPassword("correct horse battery", a)).toBe(true);
  expect(await verifyPassword("correct horse batterY", a)).toBe(false);
  expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  expect(await verifyPassword("anything", "scrypt$16384$8$1$$")).toBe(false);
});

test("checkout signatures: Razorpay's documented HMAC over order|payment, compared safely", () => {
  const secret = "test_secret";
  const good = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
  expect(checkoutSignatureValid("order_1", "pay_1", good, secret)).toBe(true);
  expect(checkoutSignatureValid("order_1", "pay_2", good, secret)).toBe(false);
  expect(checkoutSignatureValid("order_1", "pay_1", good.slice(1), secret)).toBe(false);
  expect(checkoutSignatureValid("order_1", "pay_1", "", secret)).toBe(false);
  expect(webhookSignatureValid('{"a":1}', createHmac("sha256", "wh").update('{"a":1}').digest("hex"), "wh")).toBe(true);
  expect(webhookSignatureValid('{"a":2}', createHmac("sha256", "wh").update('{"a":1}').digest("hex"), "wh")).toBe(false);
});

test("only same-origin requests pass", () => {
  const req = (origin: string | null, host = "localhost:3000") => new Request("http://localhost:3000/api/x", { method: "POST", headers: { host, ...(origin ? { origin } : {}) } });
  expect(sameOrigin(req("http://localhost:3000"))).toBe(true);
  expect(sameOrigin(req("https://evil.example"))).toBe(false);
  expect(sameOrigin(req(null))).toBe(false);
  expect(sameOrigin(req("not a url"))).toBe(false);
});

test("rate limiting counts per key inside the window", () => {
  const key = `t:${Math.random()}`;
  for (let i = 0; i < 3; i++) expect(rateLimited(key, 3, 1000, 10_000 + i)).toBe(false);
  expect(rateLimited(key, 3, 1000, 10_010)).toBe(true);
  expect(rateLimited(key, 3, 1000, 20_000)).toBe(false); // window passed
});

test("input rules", () => {
  expect(normalizeEmail("  A@Example.COM ")).toBe("a@example.com");
  expect(normalizeEmail(42)).toBe("");
  expect(emailError("a@example.com")).toBeNull();
  for (const bad of ["", "a", "a@b", "a @b.c", `${"x".repeat(250)}@b.co`]) expect(emailError(bad)).not.toBeNull();
  expect(passwordError("12345678")).toBeNull();
  for (const bad of ["1234567", undefined, 12345678, "x".repeat(201)]) expect(passwordError(bad)).not.toBeNull();
  expect(safeNext("/studio?g=abc")).toBe("/studio?g=abc");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", undefined, "studio"]) expect(safeNext(bad)).toBe("/studio");
});

test("prices: the server's table, whole units of the smallest coin, and the currency guess", () => {
  expect(PRICES.INR.amount).toBe(209900);
  expect(PRICES.USD.amount).toBe(2500);
  expect(isCurrency("INR")).toBe(true);
  for (const bad of ["inr", "EUR", "__proto__", "toString", 1, null]) expect(isCurrency(bad)).toBe(false);
  expect(guessCurrency("Asia/Kolkata")).toBe("INR");
  expect(guessCurrency("Asia/Calcutta")).toBe("INR");
  expect(guessCurrency("Europe/London")).toBe("USD");
});

test("coupon maths and code clean-up", async () => {
  const { discounted, money, normalizeCode } = await import("../pricing");
  expect(discounted(2500, 50)).toBe(1250);
  expect(discounted(209900, 50)).toBe(104950);
  expect(discounted(2500, 33)).toBe(1675);
  expect(discounted(209900, 90)).toBe(20990);
  expect(money(2500, "USD")).toBe("$25");
  expect(money(1250, "USD")).toBe("$12.50");
  expect(money(104950, "INR")).toBe("₹1,049.50");
  expect(money(209900, "INR")).toBe("₹2,099");
  expect(normalizeCode(" launch50 ")).toBe("LAUNCH50");
  for (const bad of ["", "ab", "has space", "semi;colon", "x".repeat(33), "50%OFF", null, 50, "' or 1=1 --"]) expect(normalizeCode(bad)).toBe("");
});

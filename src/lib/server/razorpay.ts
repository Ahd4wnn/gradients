import { createHmac, timingSafeEqual } from "node:crypto";

/** Thin client for the three Razorpay REST calls we need. No SDK: these are plain authenticated JSON requests. */
const API = "https://api.razorpay.com/v1";

function keys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set (see .env.example).");
  return { id, secret };
}

export const publicKeyId = () => keys().id;

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { id, secret } = keys();
  const res = await fetch(API + path, {
    method: init.method ?? "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${path}: ${res.status} ${json?.error?.description ?? ""}`.trim());
  return json as T;
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string };
export type RzpPayment = { id: string; order_id: string; amount: number; currency: string; status: "created" | "authorized" | "captured" | "refunded" | "failed" };

export const createOrder = (amount: number, currency: string, receipt: string, notes: Record<string, string>) =>
  call<RzpOrder>("/orders", { method: "POST", body: { amount, currency, receipt, notes } });
export const getPayment = (id: string) => call<RzpPayment>(`/payments/${encodeURIComponent(id)}`);
export const orderPayments = (orderId: string) => call<{ items: RzpPayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`).then((r) => r.items);
export const capturePayment = (id: string, amount: number, currency: string) =>
  call<RzpPayment>(`/payments/${encodeURIComponent(id)}/capture`, { method: "POST", body: { amount, currency } });

const sameHex = (a: string, b: string) => {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The checkout callback is signed with the key secret over "order_id|payment_id" (Razorpay docs). */
export const checkoutSignatureValid = (orderId: string, paymentId: string, signature: string, secret = keys().secret) =>
  sameHex(createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);

/** Webhooks are signed with the webhook secret over the raw request body. */
export const webhookSignatureValid = (rawBody: string, signature: string, secret: string) =>
  sameHex(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);

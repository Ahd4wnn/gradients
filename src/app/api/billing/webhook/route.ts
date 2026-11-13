import { settleFromWebhook } from "@/lib/server/billing";
import { webhookSignatureValid, type RzpPayment } from "@/lib/server/razorpay";

/**
 * Razorpay webhook (Dashboard > Settings > Webhooks, events payment.captured and order.paid). Optional: the checkout
 * callback and the reconcile on page load already record payments; this covers a buyer who never comes back.
 * Disabled until RAZORPAY_WEBHOOK_SECRET is set, since it needs a public URL.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook not configured", { status: 404 });
  const raw = await req.text();
  if (!webhookSignatureValid(raw, req.headers.get("x-razorpay-signature") ?? "", secret)) return new Response("bad signature", { status: 400 });
  const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: RzpPayment } } };
  const payment = event.payload?.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id) await settleFromWebhook(payment.order_id, payment);
  return new Response("ok");
}

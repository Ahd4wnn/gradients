import { getAccount } from "@/lib/server/account";
import { confirmPayment } from "@/lib/server/billing";
import { json, sameOrigin } from "@/lib/server/guard";
import { checkoutSignatureValid } from "@/lib/server/razorpay";

const str = (v: unknown) => (typeof v === "string" && v.length < 100 ? v : "");

/** Called by the checkout page after Razorpay's handler fires. Trusts nothing from the browser but the signature. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const account = await getAccount();
  if (!account) return json({ error: "Sign in first." }, 401);
  const body = await req.json().catch(() => ({}));
  const orderId = str(body.razorpay_order_id);
  const paymentId = str(body.razorpay_payment_id);
  const signature = str(body.razorpay_signature);
  if (!orderId || !paymentId || !signature || !checkoutSignatureValid(orderId, paymentId, signature)) return json({ error: "That payment could not be verified." }, 400);
  try {
    if (await confirmPayment(account.id, orderId, paymentId)) return json({ ok: true });
    return json({ error: "Razorpay has not confirmed this payment yet. If money left your account, it will show on your account page within a few minutes." }, 409);
  } catch (e) {
    console.error("[billing] verify failed", e);
    return json({ error: "Could not reach Razorpay to confirm the payment. Open your account page in a minute; it checks again." }, 502);
  }
}

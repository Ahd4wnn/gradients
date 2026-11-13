import { PRICES, type Currency } from "../pricing";
import { db } from "./db";
import { capturePayment, createOrder, getPayment, orderPayments, publicKeyId, type RzpPayment } from "./razorpay";

type Purchase = { razorpay_order_id: string; amount: number; currency: string; status: string };

/** Creates a Razorpay order for the lifetime licence and records it as pending. */
export async function startCheckout(userId: string, currency: Currency) {
  const { amount } = PRICES[currency];
  const order = await createOrder(amount, currency, `gf_${Date.now().toString(36)}`, { user_id: userId, product: "lifetime" });
  await db().query("insert into purchases (user_id, razorpay_order_id, amount, currency) values ($1, $2, $3, $4)", [userId, order.id, amount, currency]);
  return { orderId: order.id, amount, currency, keyId: publicKeyId() };
}

/**
 * Marks a purchase paid once Razorpay holds the money. The payment must belong to this order and match its amount and
 * currency; an authorised-but-uncaptured payment is captured here, so it does not depend on the dashboard's
 * auto-capture setting. Idempotent.
 */
async function settle(p: Purchase, payment: RzpPayment): Promise<boolean> {
  if (payment.order_id !== p.razorpay_order_id || payment.amount !== p.amount || payment.currency !== p.currency) return false;
  if (payment.status === "authorized") payment = await capturePayment(payment.id, p.amount, p.currency);
  if (payment.status !== "captured") return false;
  await db().query("update purchases set status = 'paid', razorpay_payment_id = $2, paid_at = coalesce(paid_at, now()) where razorpay_order_id = $1", [p.razorpay_order_id, payment.id]);
  return true;
}

/** After the checkout callback (its signature already checked): confirm with Razorpay and record the payment. */
export async function confirmPayment(userId: string, orderId: string, paymentId: string): Promise<boolean> {
  const { rows } = await db().query<Purchase>("select razorpay_order_id, amount, currency, status from purchases where razorpay_order_id = $1 and user_id = $2", [orderId, userId]);
  if (!rows[0]) return false;
  if (rows[0].status === "paid") return true;
  return settle(rows[0], await getPayment(paymentId));
}

/**
 * Catches payments whose browser closed before the callback ran: asks Razorpay about this user's recent pending
 * orders. Runs on the checkout and account pages, so nobody pays twice or loses a payment. True if it found one.
 */
export async function reconcile(userId: string): Promise<boolean> {
  const { rows } = await db().query<Purchase>(
    "select razorpay_order_id, amount, currency, status from purchases where user_id = $1 and status = 'created' and created_at > now() - interval '7 days' order by created_at desc limit 5",
    [userId],
  );
  for (const p of rows) {
    for (const payment of await orderPayments(p.razorpay_order_id)) if (await settle(p, payment)) return true;
  }
  return false;
}

/** From a verified webhook: mark the order paid if Razorpay says it was captured. */
export async function settleFromWebhook(orderId: string, payment: RzpPayment): Promise<void> {
  const { rows } = await db().query<Purchase>("select razorpay_order_id, amount, currency, status from purchases where razorpay_order_id = $1", [orderId]);
  if (rows[0] && rows[0].status !== "paid") await settle(rows[0], payment);
}

import { getAccount } from "@/lib/server/account";
import { reconcile, startCheckout } from "@/lib/server/billing";
import { json, rateLimited, sameOrigin } from "@/lib/server/guard";
import { isCurrency } from "@/lib/pricing";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const account = await getAccount();
  if (!account) return json({ error: "Sign in first." }, 401);
  if (rateLimited(`order:${account.id}`, 10, 60 * 60_000)) return json({ error: "Too many checkout attempts. Try again later." }, 429);
  const { currency } = await req.json().catch(() => ({}));
  if (!isCurrency(currency)) return json({ error: "Unknown currency." }, 400);

  // never sell the licence twice: settle anything Razorpay already holds first
  if (account.pro || (await reconcile(account.id))) return json({ alreadyPaid: true });
  try {
    return json({ ...(await startCheckout(account.id, currency)), email: account.email, name: account.name });
  } catch (e) {
    console.error("[billing] order failed", e);
    return json({ error: currency === "USD" ? "Paying in US dollars is not available right now. Switch to rupees, or try again later." : "Could not start the payment. Try again in a minute." }, 502);
  }
}

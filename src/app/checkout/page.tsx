import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "@/components/Checkout";
import { Price } from "@/components/Price";
import { Shell, Wait } from "@/components/Shell";
import { getAccount } from "@/lib/server/account";
import { reconcile } from "@/lib/server/billing";
import { findCoupon } from "@/lib/server/coupon";
import { normalizeCode } from "@/lib/pricing";
import { safeNext } from "@/lib/validate";

export const metadata = { title: "Checkout · gradients by f13s" };

async function Pay({ searchParams }: { searchParams: Promise<{ next?: string; code?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const typed = normalizeCode(params.code);
  const account = await getAccount();
  // keep the code through sign-in, so a coupon link still works for someone who has no account yet
  if (!account) redirect(`/signin?next=${encodeURIComponent(`/checkout?next=${encodeURIComponent(next)}${typed ? `&code=${typed}` : ""}`)}`);
  // a payment whose browser closed before confirming is picked up here, so nobody is asked to pay twice
  if (account.pro || (await reconcile(account.id).catch(() => false))) redirect(next);
  const coupon = typed ? await findCoupon(typed) : null;
  return (
    <div className="space-y-6">
      <Price size="sm" percentOff={coupon?.percentOff} />
      {coupon && <p role="status" className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Code {coupon.code} applied: {coupon.percentOff}% off.</p>}
      {params.code && !coupon && <p role="alert" className="rounded-2xl bg-white/10 px-4 py-3 text-sm">That code is not valid, has expired, or has been used up. The regular price is shown.</p>}
      <ul className="space-y-1.5 text-sm text-white/70">
        <li>The full studio, every layer type</li>
        <li>PNG export up to 4K, HTML and React embeds</li>
        <li>One payment, no subscription</li>
      </ul>
      <Checkout next={next} code={coupon?.code} percentOff={coupon?.percentOff} />
      {!coupon && (
        <form method="get" action="/checkout" className="flex gap-2">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="code" className="sr-only">Coupon code</label>
          <input id="code" name="code" placeholder="Coupon code" autoComplete="off" autoCapitalize="characters" maxLength={32} className="field min-w-0 flex-1" />
          <button type="submit" className="btn">Apply</button>
        </form>
      )}
      <p className="text-center text-xs text-white/50">
        Signed in as {account.email}. Payment by Razorpay. <Link href="/refunds" className="underline underline-offset-2">Refund policy</Link>
      </p>
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/checkout">) {
  return (
    <Shell title={<>Lifetime <em className="font-serif">access</em></>} subtitle="Pay once. The studio stays open on your account.">
      <Suspense fallback={<Wait />}>
        <Pay searchParams={searchParams as Promise<{ next?: string; code?: string }>} />
      </Suspense>
    </Shell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "@/components/Checkout";
import { Price } from "@/components/Price";
import { Shell, Wait } from "@/components/Shell";
import { getAccount } from "@/lib/server/account";
import { reconcile } from "@/lib/server/billing";
import { safeNext } from "@/lib/validate";

export const metadata = { title: "Checkout · gradients by f13s" };

async function Pay({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const account = await getAccount();
  if (!account) redirect(`/signin?next=${encodeURIComponent(`/checkout?next=${encodeURIComponent(next)}`)}`);
  // a payment whose browser closed before confirming is picked up here, so nobody is asked to pay twice
  if (account.pro || (await reconcile(account.id).catch(() => false))) redirect(next);
  return (
    <div className="space-y-6">
      <Price size="sm" />
      <ul className="space-y-1.5 text-sm text-white/70">
        <li>The full studio, every layer type</li>
        <li>PNG export up to 4K, HTML and React embeds</li>
        <li>One payment, no subscription</li>
      </ul>
      <Checkout next={next} />
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
        <Pay searchParams={searchParams as Promise<{ next?: string }>} />
      </Suspense>
    </Shell>
  );
}

import Link from "next/link";
import { Legal } from "@/components/Legal";

export const metadata = { title: "Refunds · gradients by f13s" };

export default function Page() {
  return (
    <Legal title="Refunds and cancellation" updated="13 November 2026">
      <h2>Cancellation</h2>
      <p>There is nothing to cancel: the licence is a single payment, not a subscription.</p>
      <h2>If a payment did not unlock the studio</h2>
      <p>
        Sign in and open your <Link href="/account" className="underline underline-offset-2">account page</Link>. It asks Razorpay about your payment again and unlocks the studio if the
        money was received.
      </p>
      <h2>Refunds</h2>
      <p>
        To ask for a refund, or if you were charged twice, email{" "}
        <a href="mailto:business@f13s.com" className="underline underline-offset-2">business@f13s.com</a> from the address on your account.
      </p>
    </Legal>
  );
}

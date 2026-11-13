import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { McpKey } from "@/components/McpKey";
import { SignOutButton } from "@/components/SignOutButton";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { MCP_MONTHLY_LIMIT } from "@/lib/mcp";
import { getAccount } from "@/lib/server/account";
import { mcpStatus } from "@/lib/server/apikey";
import { reconcile } from "@/lib/server/billing";
import { db } from "@/lib/server/db";

export const metadata = { title: "Account · gradients by f13s" };

const money = (amount: number, currency: string) => new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
const day = (d: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(d);

async function Details() {
  let account = await getAccount();
  if (!account) redirect("/signin?next=/account");
  if (!account.pro && (await reconcile(account.id).catch(() => false))) account = { ...account, pro: true };
  const { rows } = await db().query<{ amount: number; currency: string; paid_at: Date; razorpay_payment_id: string }>(
    "select amount, currency, paid_at, razorpay_payment_id from purchases where user_id = $1 and status = 'paid' order by paid_at",
    [account.id],
  );
  const mcp = account.pro ? await mcpStatus(account.id) : null;
  const card = "rounded-3xl bg-white/5 p-6 sm:p-8";
  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="text-sm text-white/50">Signed in as</h2>
        <p className="mt-1 text-xl tracking-tight">{account.name ? `${account.name} · ` : ""}{account.email}</p>
        <div className="mt-6"><SignOutButton /></div>
      </section>
      <section className={card}>
        <h2 className="text-sm text-white/50">Licence</h2>
        {account.pro ? (
          <>
            <p className="mt-1 text-xl tracking-tight">Lifetime access</p>
            <Link href="/studio" className="btn btn-primary mt-6">Open the studio</Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-xl tracking-tight">Not purchased yet</p>
            <p className="mt-2 text-sm text-white/60">If you paid and this still says so, Razorpay has not confirmed the payment yet. Reload in a minute.</p>
            <Link href="/checkout" className="btn btn-primary mt-6">Get lifetime access</Link>
          </>
        )}
      </section>
      {mcp && (
        <section className={card}>
          <h2 className="text-sm text-white/50">MCP server</h2>
          <p className="mt-1 text-xl tracking-tight">Let Claude and other agents make gradients</p>
          <p className="mt-2 text-sm text-white/60">
            Your agent asks for a gradient and gets back a studio link and the embed code. {mcp.used} of {MCP_MONTHLY_LIMIT} gradients used this month.
            {mcp.keyCreated ? ` Key created ${day(mcp.keyCreated)}${mcp.lastUsed ? `, last used ${day(mcp.lastUsed)}` : ", not used yet"}.` : " You have no key yet."}
          </p>
          <McpKey hasKey={!!mcp.keyCreated} />
        </section>
      )}
      {rows.length > 0 && (
        <section className={card}>
          <h2 className="text-sm text-white/50">Payments</h2>
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {rows.map((r) => (
              <li key={r.razorpay_payment_id} className="flex flex-wrap justify-between gap-2 py-3">
                <span>{day(r.paid_at)} · Lifetime access</span>
                <span className="text-white/60">{money(r.amount, r.currency)} · {r.razorpay_payment_id}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <SiteNav links={false} />
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-32">
        <h1 className="mb-8 text-4xl tracking-tight">Your <em className="font-serif">account</em></h1>
        <Suspense fallback={<p className="text-white/50">Loading your account…</p>}>
          <Details />
        </Suspense>
      </div>
      <SiteFooter />
    </main>
  );
}

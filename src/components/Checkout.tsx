"use client";
import { useState } from "react";
import { discounted, money, PRICES } from "@/lib/pricing";
import { useCurrency } from "./useCurrency";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: "payment.failed", fn: (r: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load"));
    document.head.append(s);
  });
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/** Pays for the lifetime licence through Razorpay Checkout, then confirms on the server before letting the buyer in. */
export function Checkout({ next, code = "", percentOff = 0 }: { next: string; code?: string; percentOff?: number }) {
  const [currency] = useCurrency();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function pay() {
    if (!currency) return;
    setBusy(true);
    setMessage("");
    try {
      await loadRazorpay();
    } catch {
      setBusy(false);
      return setMessage("Could not load Razorpay. Check your connection, or turn off a blocker for checkout.razorpay.com.");
    }
    const order = await post("/api/billing/order", { currency, ...(code ? { code } : {}) }).catch(() => ({ ok: false, data: { error: "Could not reach the server. Check your connection." } as Record<string, string | undefined> }));
    if (order.data.alreadyPaid) return location.assign(next);
    if (!order.ok) {
      setBusy(false);
      return setMessage(order.data.error ?? "Could not start the payment.");
    }
    const rzp = new window.Razorpay!({
      key: order.data.keyId,
      order_id: order.data.orderId,
      amount: order.data.amount,
      currency: order.data.currency,
      name: "gradients by f13s",
      description: "Lifetime access",
      prefill: { email: order.data.email, name: order.data.name ?? undefined },
      theme: { color: "#000000" },
      handler: async (r: RazorpayResponse) => {
        setMessage("Confirming your payment…");
        const done = await post("/api/billing/verify", r).catch(() => ({ ok: false, data: {} as { error?: string } }));
        if (done.ok) return location.assign(next);
        setBusy(false);
        setMessage(done.data.error ?? "Payment received but not confirmed yet. Open your account page in a minute.");
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", (r) => setMessage(r.error?.description ?? "The payment did not go through. No money was taken for this attempt."));
    rzp.open();
  }

  return (
    <div className="space-y-3">
      <button type="button" className="btn btn-primary w-full py-3.5 text-base" disabled={busy || !currency} onClick={pay}>
        {busy ? "Opening payment…" : `Pay ${percentOff ? money(discounted(PRICES[currency ?? "USD"].amount, percentOff), currency ?? "USD") : PRICES[currency ?? "USD"].label} and open the studio`}
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-white/70">{message}</p>
    </div>
  );
}

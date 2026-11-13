"use client";
import { discounted, money, PRICES, type Currency } from "@/lib/pricing";
import { useCurrency } from "./useCurrency";

/** The lifetime price in the visitor's currency, with a switch. With a coupon, the reduced price and the regular one struck through. */
export function Price({ size = "lg", percentOff = 0 }: { size?: "lg" | "sm"; percentOff?: number }) {
  const [currency, setCurrency] = useCurrency();
  const regular = PRICES[currency ?? "USD"];
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <p className={size === "lg" ? "text-6xl tracking-tight" : "text-4xl tracking-tight"}>
        {/* fixed width placeholder until the browser knows the currency, so nothing jumps */}
        <span className={currency ? "" : "invisible"}>
          {percentOff ? money(discounted(regular.amount, percentOff), currency ?? "USD") : regular.label}
          {percentOff > 0 && (
            <s className="ml-3 text-xl text-white/50">
              <span className="sr-only">regular price </span>
              {regular.label}
            </s>
          )}
        </span>
        <span className="ml-2 text-base text-white/60">once</span>
      </p>
      <div role="radiogroup" aria-label="Currency" className="mb-2 flex rounded-full bg-white/10 p-1 text-xs font-medium">
        {(Object.keys(PRICES) as Currency[]).map((c) => (
          <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => setCurrency(c)} className={`rounded-full px-3 py-1 ${currency === c ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

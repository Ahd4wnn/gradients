/** The one price list. The server charges from this table; the browser only ever sends a currency code. */
export const PRICES = {
  INR: { amount: 209900, label: "₹2,099" },
  USD: { amount: 2500, label: "$25" },
} as const;

export type Currency = keyof typeof PRICES;

export const isCurrency = (v: unknown): v is Currency => typeof v === "string" && Object.hasOwn(PRICES, v);

/** Visitors whose clock is set to India see rupees; everyone else sees dollars. They can switch. */
export function guessCurrency(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): Currency {
  return timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta" ? "INR" : "USD";
}

/** A coupon code as stored: letters and digits, upper case. Empty string if it cannot be a code. */
export const normalizeCode = (v: unknown) => (typeof v === "string" && /^[a-z0-9]{3,32}$/i.test(v.trim()) ? v.trim().toUpperCase() : "");

/** The price after a percentage off, in the smallest currency unit (paise or cents). */
export const discounted = (amount: number, percentOff: number) => Math.round((amount * (100 - percentOff)) / 100);

/** An amount in the smallest unit as text: "$25", "$12.50", "₹1,049.50". */
export const money = (amount: number, currency: Currency) =>
  new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(amount / 100);

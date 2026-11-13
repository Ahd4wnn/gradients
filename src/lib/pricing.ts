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

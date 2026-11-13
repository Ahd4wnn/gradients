import { normalizeCode } from "../pricing";
import { db } from "./db";

export type Coupon = { code: string; percentOff: number };

/**
 * The coupon for a code someone typed or followed a link with, or null if it does not exist, has expired or is used up.
 * ponytail: the use count rises when a payment settles, not when checkout starts, so the last few uses can be
 * oversold by people paying at the same moment. Reserve a use at order time if a hard cap ever matters.
 */
export async function findCoupon(code: unknown): Promise<Coupon | null> {
  const c = normalizeCode(code);
  if (!c) return null;
  const { rows } = await db().query<{ code: string; percent_off: number }>(
    "select code, percent_off from coupons where code = $1 and (expires_at is null or expires_at > now()) and (max_uses is null or uses < max_uses)",
    [c],
  );
  return rows[0] ? { code: rows[0].code, percentOff: rows[0].percent_off } : null;
}

// Create, change or list coupon codes. Reads DATABASE_URL, so run it with the env file:
//
//   node --env-file=.env.local scripts/coupon.mjs                        list every code
//   node --env-file=.env.local scripts/coupon.mjs LAUNCH50 50 100 30     50% off, first 100 purchases, for 30 days
//   node --env-file=.env.local scripts/coupon.mjs FRIENDS 25             25% off, no limit, no expiry
//   node --env-file=.env.local scripts/coupon.mjs LAUNCH50 off           switch a code off (it expires now)
//
// Running it again for an existing code changes its terms and keeps its use count.
import pg from "pg";

const [code, percent, maxUses, days] = process.argv.slice(2);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  if (code) {
    if (!/^[A-Za-z0-9]{3,32}$/.test(code)) throw new Error("A code is 3 to 32 letters and digits.");
    const name = code.toUpperCase();
    if (percent === "off") {
      const r = await db.query("update coupons set expires_at = now() where code = $1", [name]);
      if (!r.rowCount) throw new Error(`No code named ${name}.`);
    } else {
      const p = Number(percent);
      if (!Number.isInteger(p) || p < 1 || p > 90) throw new Error("Percent off must be a whole number from 1 to 90.");
      const max = maxUses === undefined ? null : Number(maxUses);
      const d = days === undefined ? null : Number(days);
      if (max !== null && !(Number.isInteger(max) && max > 0)) throw new Error("Max uses must be a positive whole number.");
      if (d !== null && !(d > 0)) throw new Error("Days must be a positive number.");
      await db.query(
        `insert into coupons (code, percent_off, max_uses, expires_at) values ($1, $2, $3, now() + make_interval(secs => $4::float8 * 86400))
         on conflict (code) do update set percent_off = excluded.percent_off, max_uses = excluded.max_uses, expires_at = excluded.expires_at`,
        [name, p, max, d],
      );
    }
  }
  const { rows } = await db.query("select code, percent_off, uses, max_uses, expires_at, (expires_at is null or expires_at > now()) and (max_uses is null or uses < max_uses) as active from coupons order by created_at");
  if (!rows.length) console.log("No coupon codes yet.");
  for (const r of rows)
    console.log(`${r.code}: ${r.percent_off}% off, used ${r.uses}${r.max_uses === null ? "" : ` of ${r.max_uses}`}, ${r.expires_at ? `until ${r.expires_at.toISOString().slice(0, 10)}` : "no expiry"}, ${r.active ? "ACTIVE" : "off"}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}

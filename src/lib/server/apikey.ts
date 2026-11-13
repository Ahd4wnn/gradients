import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
const MONTH = "date_trunc('month', now() at time zone 'utc')::date";

/** Makes this account's key, replacing any earlier one. The returned key is the only time it exists in the clear. */
export async function createApiKey(userId: string): Promise<string> {
  const key = `gf_${randomBytes(24).toString("base64url")}`;
  await db().query(
    `insert into api_keys (key_hash, user_id) values ($1, $2)
     on conflict (user_id) do update set key_hash = excluded.key_hash, created_at = now(), last_used_at = null`,
    [hashKey(key), userId],
  );
  return key;
}

/** Who a key belongs to and whether they have paid, or null for an unknown key. Records the use. */
export async function apiKeyAccount(key: string): Promise<{ id: string; pro: boolean } | null> {
  const { rows } = await db().query<{ id: string; pro: boolean }>(
    `update api_keys k set last_used_at = now() where k.key_hash = $1
     returning k.user_id as id, exists (select 1 from purchases p where p.user_id = k.user_id and p.status = 'paid') as pro`,
    [hashKey(key)],
  );
  return rows[0] ?? null;
}

/** Takes one from this month's allowance. False, and nothing taken, when the month is already at `limit`. One statement, so two requests cannot both take the last one. */
export async function takeMcpUse(userId: string, limit: number): Promise<boolean> {
  const { rows } = await db().query(
    `insert into mcp_usage (user_id, month, count) values ($1, ${MONTH}, 1)
     on conflict (user_id, month) do update set count = mcp_usage.count + 1 where mcp_usage.count < $2
     returning count`,
    [userId, limit],
  );
  return rows.length > 0;
}

/** For the account page: when the key was made (null if there is none) and how much of this month is used. */
export async function mcpStatus(userId: string): Promise<{ keyCreated: Date | null; lastUsed: Date | null; used: number }> {
  const { rows } = await db().query<{ created_at: Date | null; last_used_at: Date | null; used: number }>(
    `select k.created_at, k.last_used_at, coalesce(u.count, 0)::int as used
     from users x
     left join api_keys k on k.user_id = x.id
     left join mcp_usage u on u.user_id = x.id and u.month = ${MONTH}
     where x.id = $1`,
    [userId],
  );
  return { keyCreated: rows[0]?.created_at ?? null, lastUsed: rows[0]?.last_used_at ?? null, used: rows[0]?.used ?? 0 };
}

import { cache } from "react";
import { db } from "./db";
import { sessionUserId } from "./session";

export type Account = { id: string; email: string; name: string | null; pro: boolean };

/**
 * The data access layer for "who is this and have they paid". Every page and route that gates on payment goes through
 * here. Cached per request, so several components can ask without repeating the queries.
 */
export const getAccount = cache(async (): Promise<Account | null> => {
  const id = await sessionUserId();
  if (!id) return null;
  const { rows } = await db().query<Account>(
    `select u.id, u.email, u.name, exists (select 1 from purchases p where p.user_id = u.id and p.status = 'paid') as pro
     from users u where u.id = $1`,
    [id],
  );
  return rows[0] ?? null;
});

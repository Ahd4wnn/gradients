import { getAccount } from "@/lib/server/account";
import { createApiKey } from "@/lib/server/apikey";
import { json, rateLimited, sameOrigin } from "@/lib/server/guard";

/** Creates (or replaces) the signed-in account's MCP key and returns it once. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const account = await getAccount();
  if (!account) return json({ error: "Sign in first." }, 401);
  if (!account.pro) return json({ error: "The MCP server comes with lifetime access." }, 403);
  if (rateLimited(`mcpkey:${account.id}`, 30, 60 * 60_000)) return json({ error: "Too many new keys. Try again in an hour." }, 429);
  return json({ key: await createApiKey(account.id) });
}

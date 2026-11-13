import { db } from "@/lib/server/db";
import { clientIp, json, rateLimited, sameOrigin } from "@/lib/server/guard";
import { verifyPassword } from "@/lib/server/password";
import { createSession } from "@/lib/server/session";
import { normalizeEmail } from "@/lib/validate";

const WRONG = "That email and password do not match an account.";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  // limit by address as well as by IP, so one account cannot be guessed at from many places
  if (rateLimited(`signin:${clientIp(req)}`, 20, 15 * 60_000) || rateLimited(`signin:${email}`, 10, 15 * 60_000))
    return json({ error: "Too many attempts. Wait 15 minutes and try again." }, 429);
  if (!email || typeof body.password !== "string") return json({ error: WRONG }, 400);

  const { rows } = await db().query<{ id: string; password_hash: string | null }>("select id, password_hash from users where email = $1", [email]);
  const user = rows[0];
  if (!user?.password_hash || !(await verifyPassword(body.password, user.password_hash))) return json({ error: WRONG }, 401);
  await createSession(user.id);
  return json({ ok: true });
}

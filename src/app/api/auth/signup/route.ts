import { db } from "@/lib/server/db";
import { clientIp, json, rateLimited, sameOrigin } from "@/lib/server/guard";
import { hashPassword } from "@/lib/server/password";
import { createSession } from "@/lib/server/session";
import { emailError, normalizeEmail, passwordError } from "@/lib/validate";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  if (rateLimited(`signup:${clientIp(req)}`, 10, 60 * 60_000)) return json({ error: "Too many sign-ups from here. Try again in an hour." }, 429);
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const problem = emailError(email) ?? passwordError(body.password);
  if (problem) return json({ error: problem }, 400);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) || null : null;

  const { rows } = await db().query<{ id: string }>(
    "insert into users (email, password_hash, name) values ($1, $2, $3) on conflict (email) do nothing returning id",
    [email, await hashPassword(body.password), name],
  );
  if (!rows[0]) return json({ error: "An account with this email already exists. Sign in instead." }, 409);
  await createSession(rows[0].id);
  return json({ ok: true });
}

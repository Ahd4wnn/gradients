import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };
const DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Starts a session and sets the cookie. Call from a Route Handler only (cookies can only be set there). */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await db().query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))", [hashToken(token), userId, DAYS]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

/** The signed-in user's id, or null. Reads the request cookie, so callers render behind a Suspense boundary. */
export async function sessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await db().query<{ user_id: string }>("select user_id from sessions where token_hash = $1 and expires_at > now()", [hashToken(token)]);
  return rows[0]?.user_id ?? null;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db().query("delete from sessions where token_hash = $1", [hashToken(token)]);
  store.delete(SESSION_COOKIE);
}

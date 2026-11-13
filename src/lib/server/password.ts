import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt from Node's standard library: memory-hard, no native dependency. Parameters are stored with each hash,
// so they can be raised later without breaking existing passwords.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

const derive = (password: string, salt: Buffer, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password.normalize("NFKC"), salt, KEYLEN, { ...opts, maxmem: 64 * 1024 * 1024 }, (e, key) => (e ? reject(e) : resolve(key))));

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const want = Buffer.from(key, "base64url");
  const got = await derive(password, Buffer.from(salt, "base64url"), { N: Number(n), r: Number(r), p: Number(p) });
  return got.length === want.length && timingSafeEqual(got, want);
}

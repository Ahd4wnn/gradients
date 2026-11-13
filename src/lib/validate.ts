/** Sign-up and sign-in input rules, shared by the forms and the API routes (the API is the one that counts). */

export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

export function emailError(email: string): string | null {
  if (!email) return "Enter your email.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email does not look right.";
  return null;
}

export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "That password is too long (200 characters at most).";
  return null;
}

/** Only same-site paths are allowed as a post-login destination, so a link cannot bounce people to another site. */
export function safeNext(v: unknown, fallback = "/studio"): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

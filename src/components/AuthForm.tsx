"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { emailError, normalizeEmail, passwordError } from "@/lib/validate";

/** Sign in or create an account. On success a full page load follows, so the server sees the new session cookie. */
export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = normalizeEmail(form.get("email"));
    const password = form.get("password");
    const problem = signup ? emailError(email) ?? passwordError(password) : null;
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name: form.get("name") }) });
      if (res.ok) return location.assign(next);
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong. Try again.");
    } catch {
      setError("Could not reach the server. Check your connection.");
    }
    setBusy(false);
  }

  const field = "field rounded-2xl px-4 py-3 font-sans text-base";
  const other = signup ? `/signin?next=${encodeURIComponent(next)}` : `/signup?next=${encodeURIComponent(next)}`;
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {signup && (
        <label className="block space-y-1.5 text-sm">
          <span>Name <span className="text-white/50">(optional)</span></span>
          <input name="name" autoComplete="name" maxLength={100} className={field} />
        </label>
      )}
      <label className="block space-y-1.5 text-sm">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required className={field} />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span>Password {signup && <span className="text-white/50">(8 characters or more)</span>}</span>
        <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} className={field} />
      </label>
      <p role="alert" className="min-h-5 text-sm text-red-300">{error}</p>
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 text-base">
        {busy ? "One moment…" : signup ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-white/60">
        {signup ? "Already have an account? " : "New here? "}
        <Link href={other} className="text-white underline underline-offset-4">{signup ? "Sign in" : "Create an account"}</Link>
      </p>
    </form>
  );
}

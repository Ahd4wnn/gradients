"use client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn"
      onClick={() =>
        fetch("/api/auth/signout", { method: "POST" }).finally(() => {
          router.push("/");
          router.refresh(); // the nav and every gated page read the session on the server
        })
      }
    >
      Sign out
    </button>
  );
}

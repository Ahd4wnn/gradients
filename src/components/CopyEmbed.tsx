"use client";
import { useState } from "react";
import { toHtml } from "@/lib/embed";
import type { Recipe } from "@/lib/recipe";

export function CopyEmbed({ recipe, name, className = "" }: { recipe: Recipe; name: string; className?: string }) {
  const [said, setSaid] = useState("");
  const say = (s: string) => {
    setSaid(s);
    setTimeout(() => setSaid(""), 1500);
  };
  return (
    <button
      type="button"
      aria-label={`Copy embed code for ${name}`}
      className={`rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-white hover:text-black ${className}`}
      onClick={() => navigator.clipboard.writeText(toHtml(recipe, location.origin)).then(() => say("Copied"), () => say("Blocked"))}
    >
      <span aria-live="polite">{said || "Copy embed"}</span>
    </button>
  );
}

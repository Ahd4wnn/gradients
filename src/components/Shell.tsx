import type { ReactNode } from "react";
import { Logo } from "./SiteNav";
import { Thumb } from "./Thumb";
import { PRESETS } from "@/lib/presets";

const ART = PRESETS.find((p) => p.name === "Frosted Aurora")!.recipe;

/** Two-column page for sign-in, sign-up and checkout: the form on the left, a gradient on the right. */
export function Shell({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-ink text-white lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-4xl tracking-tight">{title}</h1>
          {subtitle && <p className="mt-3 text-white/60">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-3xl">
          <div className="absolute inset-0"><Thumb recipe={ART} /></div>
        </div>
      </div>
    </main>
  );
}

export const Wait = () => <p className="text-white/50">One moment…</p>;

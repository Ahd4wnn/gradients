import type { ReactNode } from "react";
import { SiteFooter, SiteNav } from "./SiteNav";

export function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-ink text-white">
      <SiteNav links={false} />
      <article className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-32 leading-relaxed text-white/75 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:tracking-tight [&_h2]:text-white">
        <h1 className="text-4xl tracking-tight text-white">{title}</h1>
        <p className="text-sm text-white/50">Last updated {updated}</p>
        {children}
      </article>
      <SiteFooter />
    </main>
  );
}

import Link from "next/link";
import { Thumb } from "@/components/Thumb";
import { PRESETS } from "@/lib/presets";
import { encodeRecipe } from "@/lib/recipe";

export default function Gallery() {
  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gradients</h1>
          <p className="mt-1 text-white/60">Pick one to open it in the studio, then make it yours.</p>
        </div>
        <Link href="/studio" className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Start from scratch</Link>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map(({ name, recipe }) => (
          <li key={name}>
            <Link href={`/studio?g=${encodeRecipe(recipe)}`} aria-label={`Open ${name} in the studio`} className="group block overflow-hidden rounded-xl border border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <div className="aspect-video"><Thumb recipe={recipe} /></div>
              <p className="px-3 py-2 text-sm text-white/80 group-hover:text-white">{name}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

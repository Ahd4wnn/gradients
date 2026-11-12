import Link from "next/link";
import { CopyEmbed } from "@/components/CopyEmbed";
import { GradientCanvas } from "@/components/GradientCanvas";
import { Thumb } from "@/components/Thumb";
import { allLayers } from "@/layers";
import { caption } from "@/lib/caption";
import { PRESETS } from "@/lib/presets";
import { encodeRecipe, layer } from "@/lib/recipe";

// Violet Dusk, moving, and the one place on the site that reacts to the cursor without being asked
const DUSK = PRESETS.find((p) => p.name === "Violet Dusk")!.recipe;
const HERO = {
  ...DUSK,
  speed: 1,
  layers: [{ ...DUSK.layers[0], params: { ...DUSK.layers[0].params, follow: 0.6 } }, layer("cursor-push", { strength: 0.05 }), ...DUSK.layers.slice(1)],
};
const STEPS = [
  ["Pick a gradient", `${PRESETS.length} starting points: mesh, grain, glass, chrome, foil, halftone and more.`],
  ["Make it yours", "Stack up to six layers in the studio. The link is the recipe, so sharing is copying the URL."],
  ["Paste one line", "A script tag and one element. No framework, no build step. Or export a PNG up to 4K."],
];
const pill = "rounded-full px-6 py-3 text-base font-medium";
const h2 = "text-center text-4xl tracking-tight sm:text-5xl";

export default function Gallery() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <nav aria-label="Main" className="fixed inset-x-0 top-4 z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-white/10 p-2 pl-5 text-sm backdrop-blur-xl">
        <span className="mr-2 font-medium">gradients <span className="text-white/60">by f13s</span></span>
        <a href="#gradients" className="hidden px-3 py-2 text-white/70 hover:text-white sm:block">Gradients</a>
        <a href="#how" className="hidden px-3 py-2 text-white/70 hover:text-white sm:block">How it works</a>
        <Link href="/studio" className="rounded-full bg-white px-4 py-2 font-medium text-black hover:bg-white/80">Studio</Link>
      </nav>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-28 text-center">
        <GradientCanvas recipe={HERO} className="!absolute inset-0 h-full w-full" />
        {/* the one scrim on the page: keeps the headline readable and fades the hero into the page */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-ink" />
        <h1 className="relative max-w-5xl text-5xl leading-[1.05] tracking-tight sm:text-7xl lg:text-[5.5rem]">
          Better <em className="font-serif">gradients</em> for the apps your agent builds
        </h1>
        <p className="relative mt-6 max-w-xl text-lg text-white/75">
          {PRESETS.length} presets, {allLayers.length} layer types, one line to embed.
        </p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3">
          <a href="#gradients" className={`${pill} bg-white text-black hover:bg-white/80`}>Browse gradients</a>
          <Link href="/studio" className={`${pill} bg-white/10 backdrop-blur hover:bg-white/20`}>Start from scratch</Link>
        </div>
      </section>

      <section id="gradients" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24">
        <h2 className={h2}>Pick a <em className="font-serif">starting point</em></h2>
        <p className="mt-4 text-center text-white/60">Open one in the studio, or copy its embed code straight away.</p>
        <ul className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map(({ name, recipe }) => (
            <li key={name} className="relative">
              <Link href={`/studio?g=${encodeRecipe(recipe)}`} aria-label={`Open ${name} in the studio`} className="group relative block aspect-[4/3] overflow-hidden rounded-3xl">
                <Thumb recipe={recipe} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-16">
                  <span className="block text-2xl tracking-tight">{name}</span>
                  <span className="block text-sm text-white/75">{caption(recipe)}</span>
                </span>
              </Link>
              <CopyEmbed recipe={recipe} name={name} className="absolute right-4 top-4" />
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24">
        <h2 className={h2}>From pick to <em className="font-serif">pasted</em> in a minute</h2>
        <ol className="mt-14 grid gap-5 lg:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-3xl bg-white/5 p-8">
              <p className="text-sm text-white/50">Step {i + 1}</p>
              <h3 className="mt-3 text-2xl tracking-tight">{title}</h3>
              <p className="mt-2 text-white/60">{body}</p>
            </li>
          ))}
        </ol>
        <pre className="mt-5 overflow-x-auto rounded-3xl bg-white/5 p-8 font-mono text-sm leading-relaxed text-white/70">{`<script type="module" src="/embed.js"></script>\n<gradient-f recipe="eyJ2IjoxLC…"></gradient-f>`}</pre>
      </section>

      <footer className="flex justify-between px-6 py-8 text-sm text-white/50">
        <span>gradients by f13s</span>
        <span>WebGL2 · OKLab</span>
      </footer>
    </main>
  );
}

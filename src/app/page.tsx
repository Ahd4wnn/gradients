import Link from "next/link";
import { HeroCopy, Marquee, Reveal } from "@/components/anim/Motion";
import { ScrollFx } from "@/components/anim/ScrollFx";
import { GradientCanvas } from "@/components/GradientCanvas";
import { Price } from "@/components/Price";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { Thumb } from "@/components/Thumb";
import { allLayers } from "@/layers";
import { caption } from "@/lib/caption";
import { PRESETS } from "@/lib/presets";
import { encodeRecipe, layer, type Recipe } from "@/lib/recipe";

// Dark Opal: liquid chrome under holographic foil, the iridescent look the 2026 references favour. It moves slowly and
// is the one place on the site that reacts to the cursor without being asked (a gentle liquid push, before the grain).
const OPAL = PRESETS.find((p) => p.name === "Dark Opal")!.recipe;
const HERO = { ...OPAL, speed: 0.6, layers: [...OPAL.layers.slice(0, -1), layer("cursor-push", { strength: 0.05 }), ...OPAL.layers.slice(-1)] };
const preset = (name: string): Recipe => PRESETS.find((p) => p.name === name)!.recipe;

const FEATURES: { title: string; body: string; recipe: Recipe }[] = [
  { title: `${allLayers.length} layer types`, body: "Mesh, aura, caustics, clouds, chrome, holographic foil, frosted and fluted glass, halftone, dither, bloom and more. Stack up to six.", recipe: preset("Chrome Tide") },
  { title: "Export up to 4K", body: "PNG at 3840 × 2160 or portrait 2160 × 3840, rendered on your GPU in 16-bit colour with no banding.", recipe: preset("Deep Horizon") },
  { title: "One line to embed", body: "A script tag and a <gradient-f> element. No framework, no build step. It animates, and pauses when off screen.", recipe: preset("Lagoon") },
  { title: "Reacts to the cursor", body: "Optional liquid push, spotlight and colours that follow the pointer, off for visitors who prefer reduced motion.", recipe: preset("Liquid Touch") },
  { title: "Drag the colours", body: "Move mesh points and light sources right on the preview. Undo anything, randomise only colours or only layers.", recipe: preset("Pearl Foil") },
  { title: "Colours from any image", body: "Drop in a photo or a brand asset and the studio pulls its palette into every layer.", recipe: preset("Sunburst") },
];

const STEPS = [
  ["Pick a starting point", `${PRESETS.length} tuned gradients to start from, or a blank studio.`],
  ["Make it yours", "Layers, colours, motion and grain. The link is the recipe, so sharing is copying the URL."],
  ["Ship it", "Export a PNG for design tools, or paste one line of HTML or React into the app your agent is building."],
];

const INCLUDED = [
  "The full studio, every layer type",
  "PNG export up to 4K, any aspect ratio",
  "HTML and React embed code",
  "Share links that reopen any gradient",
  "Palettes, image colours, undo",
  "One payment, no subscription",
];

const FAQ = [
  ["Is this a subscription?", "No. You pay once and your account keeps access to the studio. There is nothing to renew or cancel."],
  ["How do I pay?", "Through Razorpay. In India you can pay in rupees by card, UPI, netbanking or wallet; elsewhere in US dollars by card. Your card details go to Razorpay, never to us."],
  ["Do embedded gradients need my account?", "No. Once you copy the embed code, the gradient runs on any site, with or without you signed in. Only the studio, where you make and export gradients, needs the licence."],
  ["What do AI agents get out of this?", "Each gradient is a short recipe in a URL, and the embed is one HTML element, so an agent can drop a polished background into a page without image files or design tools."],
  ["Does it work on phones?", "Embedded gradients do, and they scale to any screen. The studio is built for a desktop browser."],
  ["What if something goes wrong with my payment?", "If money left your account but the studio did not open, sign in and open your account page: it checks with Razorpay again and unlocks the studio. See the refund policy for the rest."],
];

const h2 = "text-4xl tracking-tight sm:text-5xl";

export default function Home() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <SiteNav />

      <ScrollFx />

      {/* Hero */}
      <section data-fx="hero" className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-32 text-center">
        <div data-fx="hero-bg" className="absolute inset-0">
          <GradientCanvas recipe={HERO} className="!absolute inset-0 h-full w-full" />
        </div>
        {/* the scrims: a soft pool of shade behind the words, and a fade from the hero into the page */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgb(0_0_0/0.45),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-ink" />
        <div data-fx="hero-copy" className="relative">
          <HeroCopy
            badge="Lifetime access · one payment"
            words={["Better", <em key="g" className="font-serif">gradients</em>, "for", "the", "apps", "your", "agent", "builds"]}
            sub={`A layered gradient studio: ${allLayers.length} layer types, export to 4K, and a one-line embed that drops into any page.`}
            actions={
              <>
                <a href="#pricing" className="rounded-full bg-white px-6 py-3 text-base font-medium text-black transition hover:scale-[1.03] hover:bg-white/90">Get lifetime access</a>
                <a href="#gallery" className="rounded-full bg-white/10 px-6 py-3 text-base font-medium backdrop-blur transition hover:scale-[1.03] hover:bg-white/20">See the gallery</a>
              </>
            }
          />
        </div>
      </section>

      <section aria-label={`${allLayers.length} layer types`} className="pb-20">
        <Marquee items={allLayers.filter((d) => d.kind !== "cursor").map((d) => d.label)} />
      </section>

      {/* Agent-ready strip */}
      <section aria-label="Embed" className="mx-auto max-w-6xl px-4">
        <Reveal className="grid items-center gap-8 rounded-3xl bg-white/5 p-8 lg:grid-cols-[1fr_1.2fr] lg:p-12">
          <div>
            <p className="text-sm text-white/50">Built for agents</p>
            <h2 className="mt-3 text-3xl tracking-tight sm:text-4xl">A gradient is <em className="font-serif">one line</em> of code</h2>
            <p className="mt-4 text-white/60">No image files to host, no design tool round trip. Copy the snippet from the studio and paste it where the background goes.</p>
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-black/60 p-6 font-mono text-sm leading-relaxed text-white/80 ring-1 ring-white/10">{`<script type="module" src="https://…/embed.js"></script>

<gradient-f
  recipe="eyJ2IjoxLCJzZWVkIjo3…"
  style="display:block;height:100vh">
</gradient-f>`}</pre>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-28">
        <Reveal>
          <h2 className={`${h2} text-center`}>Everything a <em className="font-serif">background</em> needs</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/60">Made with a hand-written WebGL2 engine that mixes colour in OKLab, so gradients stay vivid instead of turning grey in the middle.</p>
        </Reveal>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <Reveal delay={(i % 3) * 0.1} className="group h-full overflow-hidden rounded-3xl bg-white/5 transition-colors hover:bg-white/[0.08]">
                <div className="aspect-[16/9] overflow-hidden">
                  <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"><Thumb recipe={f.recipe} /></div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{f.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Gallery */}
      <section id="gallery" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={h2}>The <em className="font-serif">gallery</em></h2>
          <p className="max-w-md text-white/60">{PRESETS.length} starting points. Open any of them in the studio and make it yours.</p>
        </Reveal>
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map(({ name, recipe }) => (
            <li key={name} data-fx="card">
              <Link href={`/studio?g=${encodeRecipe(recipe)}`} aria-label={`Open ${name} in the studio`} className="group relative block aspect-[4/3] overflow-hidden rounded-3xl">
                <span className="block h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"><Thumb recipe={recipe} /></span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-14">
                  <span className="block text-lg tracking-tight">{name}</span>
                  <span className="block truncate text-xs text-white/70">{caption(recipe)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-label="How it works" className="mx-auto max-w-6xl px-4 pb-28">
        <Reveal><h2 className={`${h2} text-center`}>From pick to <em className="font-serif">shipped</em></h2></Reveal>
        <ol className="mt-14 grid gap-5 lg:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <Reveal delay={i * 0.12} className="h-full rounded-3xl bg-white/5 p-8">
                <p className="text-sm text-white/50">Step {i + 1}</p>
                <h3 className="mt-3 text-2xl tracking-tight">{title}</h3>
                <p className="mt-2 text-white/60">{body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-28">
        <Reveal>
          <h2 className={`${h2} text-center`}>One price, <em className="font-serif">forever</em></h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/60">No plans to compare and nothing monthly. Pay once and the studio is yours.</p>
        </Reveal>
        <Reveal delay={0.1} className="mx-auto mt-14 grid max-w-4xl overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 lg:grid-cols-2">
          <div className="relative min-h-64 overflow-hidden">
            <div data-fx="drift" className="absolute inset-x-0 -inset-y-[8%]"><Thumb recipe={preset("Opal Satin")} /></div>
          </div>
          <div className="space-y-6 p-8 lg:p-10">
            <div>
              <p className="text-sm text-white/50">Lifetime licence</p>
              <div className="mt-3"><Price /></div>
            </div>
            <ul className="space-y-2.5 text-sm">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 6.5 12 13 4.5" /></svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?next=/checkout" className="btn btn-primary w-full py-3.5 text-base">Get lifetime access</Link>
            <p className="text-center text-xs text-white/50">Secure payment by Razorpay. Already bought it? <Link href="/signin" className="underline underline-offset-2">Sign in</Link></p>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-28">
        <Reveal><h2 className={`${h2} text-center`}>Questions</h2></Reveal>
        <Reveal delay={0.1} className="mt-12 divide-y divide-white/10 rounded-3xl bg-white/5">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg tracking-tight">
                {q}
                <span aria-hidden className="text-2xl leading-none text-white/50 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-white/60">{a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl px-8 py-20 text-center">
          <div data-fx="drift" className="absolute inset-x-0 -inset-y-[8%]"><Thumb recipe={preset("Frosted Aurora")} /></div>
          <div className="relative">
            <h2 className="text-4xl tracking-tight text-black sm:text-5xl">Make the background <em className="font-serif">the best part</em></h2>
            <Link href="/signup?next=/checkout" className="mt-8 inline-block rounded-full bg-black px-6 py-3 text-base font-medium text-white hover:bg-black/80">Get lifetime access</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

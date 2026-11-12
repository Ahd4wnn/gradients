"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controls } from "@/components/Controls";
import { GradientCanvas } from "@/components/GradientCanvas";
import { LayerStack } from "@/components/LayerStack";
import { getLayer } from "@/layers";
import { toHtml, toReact } from "@/lib/embed";
import { exportPng } from "@/lib/exportPng";
import { decodeRecipe, encodeRecipe, randomRecipe, type Recipe } from "@/lib/recipe";

const SIZES = ["1280x720", "1920x1080", "2560x1440", "3840x2160", "1080x1080", "2160x2160", "1080x1920", "2160x3840"];
const btn = "rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40";

export default function Studio() {
  const [recipe, setRecipe] = useState<Recipe>(() => decodeRecipe(new URLSearchParams(location.search).get("g")));
  const [selected, setSelected] = useState(0);
  const [size, setSize] = useState(SIZES[1]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep the address bar equal to the share link.
  useEffect(() => {
    const t = setTimeout(() => history.replaceState(null, "", `?g=${encodeRecipe(recipe)}`), 300);
    return () => clearTimeout(t);
  }, [recipe]);

  const index = Math.min(selected, recipe.layers.length - 1);
  const current = recipe.layers[index];
  const def = getLayer(current.type)!;

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => setStatus(`${what} copied`),
      () => setStatus(`Could not copy: the browser blocked clipboard access.`),
    );

  async function download() {
    const [w, h] = size.split("x").map(Number);
    setBusy(true);
    setStatus("Rendering…");
    try {
      const url = URL.createObjectURL(await exportPng(recipe, w, h));
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradient-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus(`Saved ${w}×${h} PNG`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-neutral-950 text-white lg:grid-cols-[1fr_22rem]">
      <div className="flex items-center justify-center p-4 lg:p-8">
        <GradientCanvas recipe={recipe} className="aspect-video w-full max-w-5xl rounded-xl shadow-2xl" />
      </div>
      <aside className="space-y-6 border-t border-white/10 p-4 lg:max-h-screen lg:overflow-y-auto lg:border-l lg:border-t-0">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Studio</h1>
          <Link href="/" className="text-sm underline underline-offset-4">Gallery</Link>
        </header>

        <LayerStack layers={recipe.layers} selected={index} onSelect={setSelected} onChange={(layers) => setRecipe({ ...recipe, layers })} />

        <Controls
          def={def}
          params={current.params}
          onChange={(key, value) => setRecipe({ ...recipe, layers: recipe.layers.map((l, i) => (i === index ? { ...l, params: { ...l.params, [key]: value } } : l)) })}
        />

        <section aria-label="Motion" className="space-y-2">
          <label htmlFor="speed" className="flex justify-between text-sm">
            Animation speed <output className="tabular-nums text-white/60">{recipe.speed}</output>
          </label>
          <input id="speed" type="range" className="w-full" min={0} max={4} step={0.05} value={recipe.speed} onChange={(e) => setRecipe({ ...recipe, speed: Number(e.target.value) })} />
        </section>

        <section aria-label="Actions" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => { setRecipe(randomRecipe(Math.floor(Math.random() * 1e9))); setSelected(0); }}>Randomise</button>
            <button type="button" className={btn} onClick={() => copy(`${location.origin}/studio?g=${encodeRecipe(recipe)}`, "Link")}>Copy link</button>
            <button type="button" className={btn} onClick={() => copy(toHtml(recipe, location.origin), "HTML")}>Copy HTML</button>
            <button type="button" className={btn} onClick={() => copy(toReact(recipe, location.origin), "React code")}>Copy React</button>
          </div>
          <div className="flex gap-2">
            <select aria-label="Export size" className="flex-1 rounded-md border border-white/20 bg-neutral-900 p-2 text-sm" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s.replace("x", " × ")}</option>)}
            </select>
            <button type="button" className={btn} disabled={busy} onClick={download}>Export PNG</button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-white/70">{status}</p>
        </section>
      </aside>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controls } from "@/components/Controls";
import { caption } from "@/lib/caption";
import { GradientCanvas } from "@/components/GradientCanvas";
import { LayerStack } from "@/components/LayerStack";
import { Slider } from "@/components/Slider";
import { getLayer } from "@/layers";
import { toHtml, toReact } from "@/lib/embed";
import { exportPng } from "@/lib/exportPng";
import { decodeRecipe, encodeRecipe, randomRecipe, type Recipe } from "@/lib/recipe";

const SIZES = ["1280x720", "1920x1080", "2560x1440", "3840x2160", "1080x1080", "2160x2160", "1080x1920", "2160x3840"];
const btn = "btn";

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

  const [w, h] = size.split("x").map(Number);
  const card = "space-y-6 rounded-3xl bg-white/5 p-5 lg:overflow-y-auto";

  return (
    <main className="flex min-h-screen flex-col gap-3 bg-ink p-3 text-white lg:h-screen">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link href="/" className={`${btn} justify-self-start`}>← gradients by f13s</Link>
        <h1 className="text-center font-medium">
          Studio <span className="hidden font-normal text-white/50 sm:inline">· {caption(recipe)}</span>
        </h1>
        <button type="button" className={`${btn} justify-self-end`} onClick={() => copy(`${location.origin}/studio?g=${encodeRecipe(recipe)}`, "Link")}>Copy link</button>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[19rem_1fr_21rem]">
        <div className="flex min-h-0 flex-col gap-3 lg:col-start-2 lg:row-start-1">
          {/* The preview takes the export size's shape, as large as fits: what you see is what you export. */}
          <div className="flex h-[50vh] min-h-0 items-center justify-center [container-type:size] lg:h-auto lg:flex-1">
            <GradientCanvas recipe={recipe} className="rounded-3xl" style={{ aspectRatio: `${w} / ${h}`, width: `min(100cqw, 100cqh * ${w} / ${h})` }} />
          </div>
          <section aria-label="Actions" className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className={btn} onClick={() => { setRecipe(randomRecipe(Math.floor(Math.random() * 1e9))); setSelected(0); }}>Randomise</button>
            <button type="button" className={btn} onClick={() => copy(toHtml(recipe, location.origin), "HTML")}>Copy HTML</button>
            <button type="button" className={btn} onClick={() => copy(toReact(recipe, location.origin), "React code")}>Copy React</button>
            <select aria-label="Export size" className="select" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s.replace("x", " × ")}</option>)}
            </select>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={download}>Export PNG</button>
          </section>
          <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-white/70">{status}</p>
        </div>

        <aside aria-label="Layers and motion" className={`${card} lg:col-start-1 lg:row-start-1`}>
          <LayerStack layers={recipe.layers} selected={index} onSelect={setSelected} onChange={(layers) => setRecipe({ ...recipe, layers })} />

          <section aria-label="Motion">
            <Slider id="speed" label="Animation speed" value={recipe.speed} min={0} max={4} step={0.05} onChange={(speed) => setRecipe({ ...recipe, speed })} />
          </section>
        </aside>

        <aside aria-label="Layer controls" className={`${card} lg:col-start-3 lg:row-start-1`}>
          <Controls
            def={def}
            params={current.params}
            onChange={(key, value) => setRecipe({ ...recipe, layers: recipe.layers.map((l, i) => (i === index ? { ...l, params: { ...l.params, [key]: value } } : l)) })}
          />
        </aside>
      </div>
    </main>
  );
}

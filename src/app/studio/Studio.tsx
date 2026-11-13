"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controls } from "@/components/Controls";
import { GradientCanvas } from "@/components/GradientCanvas";
import { Handles } from "@/components/Handles";
import { Icon } from "@/components/Icon";
import { LayerStack } from "@/components/LayerStack";
import { Palettes } from "@/components/Palettes";
import { Slider } from "@/components/Slider";
import { getLayer } from "@/layers";
import { caption } from "@/lib/caption";
import { toHtml, toReact } from "@/lib/embed";
import { exportPng } from "@/lib/exportPng";
import { record, redo, start, undo, type History } from "@/lib/history";
import { BLENDS, decodeRecipe, encodeRecipe, reroll, withColors, type Blend, type Layer, type Recipe } from "@/lib/recipe";

const SIZES = ["1280x720", "1920x1080", "2560x1440", "3840x2160", "1080x1080", "2160x2160", "1080x1920", "2160x3840"];
const REROLL = [
  ["all", "Everything"],
  ["colors", "Colours only"],
  ["layout", "Layers only"],
] as const;
const BLEND_LABELS: Record<Blend, string> = { normal: "Normal", screen: "Screen", multiply: "Multiply", overlay: "Overlay", add: "Add (glow)" };
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";

/** A key press that belongs to a text field or control should not trigger studio shortcuts. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export default function Studio() {
  const [hist, setHistory] = useState<History<Recipe>>(() => start(decodeRecipe(new URLSearchParams(location.search).get("g"))));
  const recipe = hist.present;
  const [selected, setSelected] = useState(0);
  const [size, setSize] = useState(SIZES[1]);
  const [mode, setMode] = useState<(typeof REROLL)[number][0]>("all");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  /** `key` names the control being edited, so one slider drag or handle drag is one undo step. */
  const setRecipe = (next: Recipe, key?: string) => setHistory((h) => record(h, next, key, performance.now()));

  // Keep the address bar equal to the share link.
  useEffect(() => {
    const t = setTimeout(() => history.replaceState(null, "", `?g=${encodeRecipe(recipe)}`), 300);
    return () => clearTimeout(t);
  }, [recipe]);

  const index = Math.min(selected, recipe.layers.length - 1);
  const current = recipe.layers[index];
  const def = getLayer(current.type)!;
  const colors = recipe.layers.map((l) => l.params.colors).find((c): c is string[] => Array.isArray(c) && c.length >= 2);
  const patchLayer = (patch: Partial<Layer>, key?: string) => setRecipe({ ...recipe, layers: recipe.layers.map((l, i) => (i === index ? { ...l, ...patch } : l)) }, key);

  const randomise = () => {
    setRecipe(reroll(recipe, Math.floor(Math.random() * 1e9), mode));
    if (mode === "all") setSelected(0);
  };

  // Shortcuts. Re-subscribed each render so they always see the current recipe; adding a listener is cheap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") setHistory(e.shiftKey ? redo : undo);
      else if (mod && k === "y") setHistory(redo);
      else if (!mod && !e.altKey && k === "r") randomise();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => setStatus(`${what} copied`),
      () => setStatus(`Could not copy: the browser blocked clipboard access.`),
    );

  const [w, h] = size.split("x").map(Number);

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

  const card = "space-y-6 rounded-3xl bg-white/5 p-5 lg:overflow-y-auto";
  const handles = !current.hidden && def.handles && def.moveHandle ? def.handles({ ...def.defaults, ...current.params }, recipe.seed) : null;

  return (
    <main className="flex min-h-screen flex-col gap-3 bg-ink p-3 text-white lg:h-screen">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link href="/" className="btn justify-self-start">← gradients by f13s</Link>
        <h1 className="text-center font-medium">
          Studio <span className="hidden font-normal text-white/50 sm:inline">· {caption(recipe)}</span>
        </h1>
        <div className="flex items-center gap-1 justify-self-end">
          <button type="button" className="icon-btn" aria-label="Undo" title={`Undo (${MOD}Z)`} disabled={!hist.past.length} onClick={() => setHistory(undo)}><Icon name="undo" /></button>
          <button type="button" className="icon-btn" aria-label="Redo" title={`Redo (${MOD}Shift+Z)`} disabled={!hist.future.length} onClick={() => setHistory(redo)}><Icon name="redo" /></button>
          <button type="button" className="btn ml-1" onClick={() => copy(`${location.origin}/studio?g=${encodeRecipe(recipe)}`, "Link")}>Copy link</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[19rem_1fr_21rem]">
        <div className="flex min-h-0 flex-col gap-3 lg:col-start-2 lg:row-start-1">
          {/* The preview takes the export size's shape, as large as fits: what you see is what you export. */}
          <div className="flex h-[50vh] min-h-0 items-center justify-center [container-type:size] lg:h-auto lg:flex-1">
            <div className="relative" style={{ aspectRatio: `${w} / ${h}`, width: `min(100cqw, 100cqh * ${w} / ${h})` }}>
              <GradientCanvas recipe={recipe} className="absolute inset-0 h-full w-full rounded-3xl" />
              {handles && (
                <Handles
                  handles={handles}
                  onMove={(i, x, y) => patchLayer({ params: def.moveHandle!({ ...def.defaults, ...current.params }, recipe.seed, i, x, y) }, `${index}:handle:${i}`)}
                />
              )}
            </div>
          </div>
          <section aria-label="Actions" className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center rounded-full bg-white/10">
              <button type="button" className="btn bg-transparent" title="Randomise (R)" onClick={randomise}>Randomise</button>
              <select aria-label="What to randomise" className="select bg-transparent" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                {REROLL.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <button type="button" className="btn" onClick={() => copy(toHtml(recipe, location.origin), "HTML")}>Copy HTML</button>
            <button type="button" className="btn" onClick={() => copy(toReact(recipe, location.origin), "React code")}>Copy React</button>
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
            <Slider id="speed" label="Animation speed" value={recipe.speed} min={0} max={4} step={0.05} onChange={(speed) => setRecipe({ ...recipe, speed }, "speed")} />
          </section>

          <Palettes current={colors} onApply={(c) => setRecipe(withColors(recipe, c))} onStatus={setStatus} />
        </aside>

        <aside aria-label="Layer controls" className={`${card} lg:col-start-3 lg:row-start-1`}>
          <Controls
            def={def}
            params={current.params}
            onChange={(key, value) => patchLayer({ params: { ...current.params, [key]: value } }, `${index}:${key}`)}
          />

          <section aria-label="Mix" className="space-y-4 border-t border-white/10 pt-5">
            <h2 className="text-lg tracking-tight">Mix <span className="text-sm text-white/50">with the layers below</span></h2>
            <Slider
              id={`${index}-opacity`}
              label="Opacity"
              value={current.opacity ?? 1}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => patchLayer({ opacity: v < 1 ? v : undefined }, `${index}:opacity`)}
            />
            <label className="flex items-center justify-between gap-3 text-sm">
              Blend
              <select className="select" value={current.blend ?? "normal"} onChange={(e) => patchLayer({ blend: e.target.value === "normal" ? undefined : (e.target.value as Blend) })}>
                {BLENDS.map((b) => <option key={b} value={b}>{BLEND_LABELS[b]}</option>)}
              </select>
            </label>
          </section>
        </aside>
      </div>
    </main>
  );
}

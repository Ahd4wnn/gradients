"use client";
import { useRef, useState } from "react";
import { dominantColors } from "@/lib/extract";
import { PALETTE_NAMES, PALETTES } from "@/lib/recipe";
import { Icon } from "./Icon";

const KEY = "gf.palettes";
const HEX = /^#[0-9a-f]{6}$/i;

// Saved palettes are a per-browser convenience; storage can be blocked or full, so every access is guarded.
function load(): string[][] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((p): p is string[] => Array.isArray(p) && p.length >= 2 && p.every((c) => typeof c === "string" && HEX.test(c))).slice(0, 12) : [];
  } catch {
    return [];
  }
}
function store(list: string[][]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* not saved; the list still works for this visit */
  }
}

function Swatch({ colors, label, onClick }: { colors: string[]; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="h-7 flex-1 overflow-hidden rounded-full ring-white/60 hover:ring-2" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
  );
}

/** Apply a palette to every colour list in the gradient; save the current one; or pull one out of an image. */
export function Palettes({ current, onApply, onStatus }: { current: string[] | undefined; onApply: (colors: string[]) => void; onStatus: (s: string) => void }) {
  const [saved, setSaved] = useState(load);
  const file = useRef<HTMLInputElement>(null);
  const update = (list: string[][]) => {
    setSaved(list);
    store(list);
  };

  async function fromImage(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return onStatus("That file is not an image.");
    try {
      const bmp = await createImageBitmap(f);
      const c = new OffscreenCanvas(64, 64).getContext("2d")!;
      c.drawImage(bmp, 0, 0, 64, 64);
      bmp.close();
      const colors = dominantColors(c.getImageData(0, 0, 64, 64).data, 5);
      onApply(colors);
      onStatus(`Applied ${colors.length} colours from ${f.name}`);
    } catch {
      onStatus("Could not read that image.");
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  return (
    <section aria-label="Palettes" className="space-y-3">
      <h2 className="text-lg tracking-tight">Palettes <span className="text-sm text-white/50">recolour every layer</span></h2>
      <div className="grid grid-cols-4 gap-2">
        {PALETTES.map((p, i) => <Swatch key={i} colors={p} label={`${PALETTE_NAMES[i]} palette`} onClick={() => onApply([...p])} />)}
      </div>
      {saved.length > 0 && (
        <ul aria-label="Saved palettes" className="space-y-1.5">
          {saved.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <Swatch colors={p} label={`Saved palette ${i + 1}`} onClick={() => onApply([...p])} />
              <button type="button" className="icon-btn" aria-label={`Delete saved palette ${i + 1}`} onClick={() => update(saved.filter((_, k) => k !== i))}><Icon name="close" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn" disabled={!current} onClick={() => current && (update([current, ...saved].slice(0, 12)), onStatus("Palette saved in this browser"))}>Save colours</button>
        <button type="button" className="btn" onClick={() => file.current?.click()}>From image</button>
      </div>
      <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Choose an image to take colours from" onChange={(e) => fromImage(e.target.files?.[0])} />
    </section>
  );
}

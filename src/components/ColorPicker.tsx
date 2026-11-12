"use client";
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { toHex, toHsv, type Hsv } from "@/lib/color";

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const KEYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

/** Saturation/brightness square, hue slider and hex field. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  // HSV is kept locally so the hue is not lost when the colour passes through grey or black.
  const [hsv, setHsv] = useState<Hsv>(() => toHsv(value));
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
    if (toHex(...hsv) !== value.toLowerCase()) setHsv(toHsv(value));
  }
  const [h, s, v] = hsv;
  const set = (next: Hsv) => {
    setHsv(next);
    onChange(toHex(...next));
  };
  const drag = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    set([h, clamp((e.clientX - r.left) / r.width), 1 - clamp((e.clientY - r.top) / r.height)]);
  };
  const key = (e: KeyboardEvent) => {
    const d = KEYS[e.key];
    if (!d) return;
    e.preventDefault();
    set([h, clamp(s + d[0] * 0.02), clamp(v + d[1] * 0.02)]);
  };
  return (
    <div className="space-y-3">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuenow={Math.round(s * 100)}
        aria-valuetext={`Saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`}
        className="relative h-32 cursor-crosshair touch-none rounded-xl"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))` }}
        onPointerDown={drag}
        onPointerMove={drag}
        onKeyDown={key}
      >
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: toHex(h, s, v) }}
        />
      </div>
      <input type="range" aria-label="Hue" className="slider hue" min={0} max={360} value={Math.round(h)} onChange={(e) => set([Number(e.target.value), s, v])} />
      <input
        type="text"
        aria-label="Hex colour"
        className="field"
        value={draft}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => {
          setDraft(e.target.value);
          if (HEX.test(e.target.value)) onChange(e.target.value.toLowerCase());
        }}
      />
    </div>
  );
}

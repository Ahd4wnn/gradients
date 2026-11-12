import type { CSSProperties } from "react";

/** Native range input (keyboard, touch and screen readers for free) with a custom filled track. */
export function Slider({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center justify-between text-sm">
        {label}
        <output className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums text-white/80">{value}</output>
      </label>
      <input id={id} type="range" className="slider mt-1" style={{ "--p": `${((value - min) / (max - min)) * 100}%` } as CSSProperties} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

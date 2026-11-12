"use client";
import type { LayerDef, Params, ParamValue } from "@/layers/types";

const row = "flex items-center justify-between gap-3 text-sm";

export function Controls({ def, params, onChange }: { def: LayerDef; params: Params; onChange: (key: string, value: ParamValue) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs uppercase tracking-widest text-white/50">{def.label}</legend>
      {def.controls.map((c) => {
        const id = `${def.id}-${c.key}`;
        const v = params[c.key];
        if (c.type === "range")
          return (
            <div key={c.key}>
              <label htmlFor={id} className={row}>
                {c.label}
                <output className="tabular-nums text-white/60">{v as number}</output>
              </label>
              <input id={id} type="range" className="w-full" min={c.min} max={c.max} step={c.step} value={v as number} onChange={(e) => onChange(c.key, Number(e.target.value))} />
            </div>
          );
        if (c.type === "select")
          return (
            <label key={c.key} className={row}>
              {c.label}
              <select className="rounded border border-white/20 bg-neutral-900 p-1" value={v as string} onChange={(e) => onChange(c.key, e.target.value)}>
                {c.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          );
        if (c.type === "toggle")
          return (
            <label key={c.key} className={row}>
              {c.label}
              <input type="checkbox" checked={v as boolean} onChange={(e) => onChange(c.key, e.target.checked)} />
            </label>
          );
        const cols = v as string[];
        return (
          <div key={c.key} role="group" aria-label={c.label} className="space-y-1 text-sm">
            <span>{c.label}</span>
            <div className="flex flex-wrap items-center gap-2">
              {cols.map((col, i) => (
                <span key={i} className="flex items-center">
                  <input type="color" aria-label={`${c.label} ${i + 1}`} value={col} onChange={(e) => onChange(c.key, cols.map((x, k) => (k === i ? e.target.value : x)))} />
                  {cols.length > c.min && (
                    <button type="button" className="px-1 hover:bg-white/10" aria-label={`Remove ${c.label} ${i + 1}`} onClick={() => onChange(c.key, cols.filter((_, k) => k !== i))}>−</button>
                  )}
                </span>
              ))}
              {cols.length < c.max && (
                <button type="button" className="rounded border border-white/20 px-2 py-1 hover:bg-white/10" onClick={() => onChange(c.key, [...cols, cols[cols.length - 1]])}>Add colour</button>
              )}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

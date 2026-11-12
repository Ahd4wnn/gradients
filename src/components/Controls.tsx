"use client";
import { useState } from "react";
import type { Control, LayerDef, Params, ParamValue } from "@/layers/types";
import { ColorPicker } from "./ColorPicker";
import { Icon } from "./Icon";
import { Slider } from "./Slider";

const row = "flex items-center justify-between gap-3 text-sm";

function ColorList({ c, cols, onChange }: { c: Extract<Control, { type: "color-list" }>; cols: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const i = open !== null && open < cols.length ? open : null;
  return (
    <div role="group" aria-label={c.label} className="space-y-2 text-sm">
      <span>{c.label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {cols.map((col, k) => (
          <button key={k} type="button" aria-label={`${c.label} ${k + 1}`} aria-expanded={i === k} className="swatch" style={{ background: col }} onClick={() => setOpen(i === k ? null : k)} />
        ))}
        {cols.length < c.max && (
          <button
            type="button"
            aria-label="Add colour"
            className="icon-btn bg-white/10"
            onClick={() => {
              onChange([...cols, cols[cols.length - 1]]);
              setOpen(cols.length);
            }}
          >
            <Icon name="plus" />
          </button>
        )}
      </div>
      {i !== null && (
        <div className="space-y-3 rounded-2xl bg-white/5 p-3">
          <ColorPicker key={i} value={cols[i]} onChange={(hex) => onChange(cols.map((x, k) => (k === i ? hex : x)))} />
          {cols.length > c.min && (
            <button
              type="button"
              aria-label={`Remove ${c.label} ${i + 1}`}
              className="btn w-full"
              onClick={() => {
                onChange(cols.filter((_, k) => k !== i));
                setOpen(null);
              }}
            >
              Remove this colour
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Controls({ def, params, onChange }: { def: LayerDef; params: Params; onChange: (key: string, value: ParamValue) => void }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 text-lg tracking-tight">{def.label}</legend>
      {def.controls.map((c) => {
        const id = `${def.id}-${c.key}`;
        const v = params[c.key];
        if (c.type === "range") return <Slider key={c.key} id={id} label={c.label} value={v as number} min={c.min} max={c.max} step={c.step} onChange={(n) => onChange(c.key, n)} />;
        if (c.type === "select")
          return (
            <label key={c.key} className={row}>
              {c.label}
              <select className="select" value={v as string} onChange={(e) => onChange(c.key, e.target.value)}>
                {c.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          );
        if (c.type === "toggle")
          return (
            <label key={c.key} className={row}>
              {c.label}
              <input type="checkbox" className="switch" checked={v as boolean} onChange={(e) => onChange(c.key, e.target.checked)} />
            </label>
          );
        if (c.type === "points") return null; // placed by dragging on the preview, so there is nothing to show in the panel
        // keyed by layer so an open picker closes when another layer is selected
        return <ColorList key={id} c={c} cols={v as string[]} onChange={(next) => onChange(c.key, next)} />;
      })}
    </fieldset>
  );
}

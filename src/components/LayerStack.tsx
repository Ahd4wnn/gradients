"use client";
import { useLayoutEffect, useRef } from "react";
import { allLayers, getLayer } from "@/layers";
import { layer as makeLayer, MAX_LAYERS, type Layer } from "@/lib/recipe";

const KINDS = [
  ["base", "Colour fields"],
  ["distort", "Distortion"],
  ["surface", "Glass and material"],
  ["texture", "Texture"],
] as const;

const btn = "rounded px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-30";

export function LayerStack({ layers, selected, onSelect, onChange }: { layers: Layer[]; selected: number; onSelect: (i: number) => void; onChange: (next: Layer[]) => void }) {
  const full = layers.length >= MAX_LAYERS;
  const list = useRef<HTMLOListElement>(null);
  // Rows are keyed by position, so after a move or delete the focused button belongs to a different layer.
  // Put focus back on the layer the user was acting on, in the same commit, so a quick second key press lands on it.
  const pending = useRef<{ row: number; selectors: string[] } | null>(null);
  const focusRow = (row: number, selectors: string[]) => (pending.current = { row, selectors });
  useLayoutEffect(() => {
    const want = pending.current;
    if (!want) return;
    pending.current = null;
    const li = list.current?.children[want.row];
    for (const s of want.selectors) {
      const el = li?.querySelector<HTMLButtonElement>(s);
      if (el && !el.disabled) return el.focus();
    }
  });
  const move = (i: number, by: -1 | 1) => {
    const next = [...layers];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
    onSelect(i + by);
    focusRow(i + by, by < 0 ? ["[data-act=up]", "[data-act=down]"] : ["[data-act=down]", "[data-act=up]"]);
  };
  return (
    <section aria-label="Layers" className="space-y-2">
      <h2 className="text-xs uppercase tracking-widest text-white/50">Layers, drawn top to bottom</h2>
      <ol ref={list} className="space-y-1">
        {layers.map((l, i) => {
          const label = getLayer(l.type)!.label;
          return (
            <li key={i} className={`flex items-center gap-1 rounded-md border px-1 ${i === selected ? "border-white/60 bg-white/10" : "border-white/10"}`}>
              <button type="button" data-act="select" aria-pressed={i === selected} onClick={() => onSelect(i)} className={`flex-1 py-2 pl-2 text-left text-sm ${l.hidden ? "text-white/40 line-through" : ""}`}>
                {label}
              </button>
              <label className="flex items-center px-1">
                <input type="checkbox" checked={!l.hidden} onChange={() => onChange(layers.map((x, k) => (k !== i ? x : x.hidden ? { type: x.type, params: x.params } : { ...x, hidden: true })))} />
                <span className="sr-only">Show {label}</span>
              </label>
              <button type="button" className={btn} data-act="up" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className={btn} data-act="down" aria-label={`Move ${label} down`} disabled={i === layers.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button
                type="button"
                className={btn}
                aria-label={`Delete ${label}`}
                disabled={layers.length === 1}
                onClick={() => {
                  onChange(layers.filter((_, k) => k !== i));
                  onSelect(Math.max(0, Math.min(selected > i ? selected - 1 : selected, layers.length - 2)));
                  focusRow(Math.min(i, layers.length - 2), ["[data-act=select]"]);
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ol>
      <select
        aria-label="Add layer"
        value=""
        disabled={full}
        className="w-full rounded-md border border-white/20 bg-neutral-900 p-2 text-sm"
        onChange={(e) => {
          if (!e.target.value) return;
          onChange([...layers, makeLayer(e.target.value)]);
          onSelect(layers.length);
        }}
      >
        <option value="">{full ? `Layer limit reached (${MAX_LAYERS})` : "Add layer…"}</option>
        {KINDS.map(([kind, title]) => (
          <optgroup key={kind} label={title}>
            {allLayers.filter((d) => d.kind === kind).map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </section>
  );
}

"use client";
import { useLayoutEffect, useRef } from "react";
import { getLayer } from "@/layers";
import { Icon } from "./Icon";
import { LayerPicker } from "./LayerPicker";
import { layer as makeLayer, MAX_LAYERS, type Layer } from "@/lib/recipe";

const btn = "icon-btn";

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
      <h2 className="text-lg tracking-tight">Layers <span className="text-sm text-white/50">drawn top to bottom</span></h2>
      <ol ref={list} className="space-y-1">
        {layers.map((l, i) => {
          const label = getLayer(l.type)!.label;
          return (
            <li key={i} className={`flex items-center rounded-2xl p-1 transition-colors ${i === selected ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}>
              <span aria-hidden className="w-7 text-center text-sm tabular-nums text-white/40">{i + 1}</span>
              <button type="button" data-act="select" aria-pressed={i === selected} onClick={() => onSelect(i)} className={`min-w-0 flex-1 truncate rounded-xl py-2 text-left text-sm ${l.hidden ? "text-white/40 line-through" : ""}`}>
                {label}
              </button>
              <label className="flex items-center">
                <input type="checkbox" className="eye" checked={!l.hidden} onChange={() => onChange(layers.map((x, k) => (k !== i ? x : { ...x, hidden: x.hidden ? undefined : true })))} />
                <span className="sr-only">Show {label}</span>
              </label>
              <button type="button" className={btn} data-act="up" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" /></button>
              <button type="button" className={btn} data-act="down" aria-label={`Move ${label} down`} disabled={i === layers.length - 1} onClick={() => move(i, 1)}><Icon name="down" /></button>
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
                <Icon name="close" />
              </button>
            </li>
          );
        })}
      </ol>
      <LayerPicker
        full={full}
        onPick={(id) => {
          onChange([...layers, makeLayer(id)]);
          onSelect(layers.length);
        }}
      />
    </section>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { allLayers } from "@/layers";
import { layer, MAX_LAYERS, type Recipe } from "@/lib/recipe";
import { Icon } from "./Icon";
import { Thumb } from "./Thumb";

const KINDS = [
  ["base", "Colour fields"],
  ["distort", "Distortion"],
  ["surface", "Glass and material"],
  ["recolor", "Colour"],
  ["texture", "Texture and finish"],
  ["cursor", "Cursor effects"],
] as const;

/** What each layer's tile shows: a base layer alone, anything else over the default mesh. */
function previews(): Map<string, Recipe> {
  return new Map(allLayers.map((d) => [d.id, { v: 1, seed: 7, frame: 0, speed: 0, layers: d.kind === "base" ? [layer(d.id)] : [layer("mesh"), layer(d.id)] }]));
}

/** "Add layer" opens a grid of live thumbnails, grouped like the spec's catalogue. */
export function LayerPicker({ full, onPick }: { full: boolean; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const tiles = useMemo(() => (open ? previews() : null), [open]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);
  return (
    <div className="space-y-3">
      <button ref={button} type="button" aria-expanded={open} disabled={full} className="btn w-full" onClick={() => setOpen(!open)}>
        <Icon name={open ? "close" : "plus"} /> {full ? `Layer limit reached (${MAX_LAYERS})` : open ? "Close" : "Add layer"}
      </button>
      {open && tiles && (
        <div role="group" aria-label="Choose a layer to add" className="space-y-4">
          {KINDS.map(([kind, title]) => (
            <section key={kind} aria-label={title}>
              <h3 className="mb-2 text-xs font-medium text-white/50">{title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {allLayers.filter((d) => d.kind === kind).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-label={`Add ${d.label}`}
                    className="group overflow-hidden rounded-xl bg-white/5 text-left hover:bg-white/10"
                    onClick={() => {
                      onPick(d.id);
                      setOpen(false);
                      button.current?.focus();
                    }}
                  >
                    <span className="block aspect-video overflow-hidden"><Thumb recipe={tiles.get(d.id)!} /></span>
                    <span className="block truncate px-2 py-1.5 text-xs">{d.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

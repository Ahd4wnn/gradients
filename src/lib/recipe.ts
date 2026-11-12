import { getLayer } from "../layers";
import type { Control, Params, ParamValue } from "../layers/types";

/** How a layer is mixed over the result below it. The order is the shader's `uBlend` index. */
export const BLENDS = ["normal", "screen", "multiply", "overlay", "add"] as const;
export type Blend = (typeof BLENDS)[number];
/** `opacity` and `blend` are stored only when they differ from 1 and "normal". */
export type Layer = { type: string; params: Params; hidden?: boolean; opacity?: number; blend?: Blend };
export type Recipe = { v: 1; seed: number; frame: number; speed: number; layers: Layer[] };

export const MAX_LAYERS = 6;
const HEX = /^#[0-9a-f]{6}$/i;

/** A layer with its defaults, plus any overrides. */
export function layer(type: string, overrides: Params = {}): Layer {
  const def = getLayer(type);
  if (!def) throw new Error(`Unknown layer "${type}"`);
  return { type, params: { ...structuredClone(def.defaults), ...overrides } };
}

export const DEFAULT_RECIPE: Recipe = { v: 1, seed: 7, frame: 0, speed: 0, layers: [layer("mesh"), layer("grain")] };

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

function cleanParam(c: Control, v: unknown, fallback: ParamValue): ParamValue {
  switch (c.type) {
    case "range":
      return num(v, c.min, c.max, fallback as number);
    case "select":
      return typeof v === "string" && c.options.includes(v) ? v : fallback;
    case "toggle":
      return typeof v === "boolean" ? v : fallback;
    case "color-list": {
      const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && HEX.test(x)).slice(0, c.max) : [];
      return list.length >= c.min ? list : structuredClone(fallback);
    }
    case "points": {
      const ok = Array.isArray(v) && v.length % 2 === 0 && v.length <= c.max * 2 && v.every((x) => typeof x === "number" && Number.isFinite(x));
      return ok ? (v as number[]).map((x) => Math.min(1.5, Math.max(-0.5, x))) : structuredClone(fallback);
    }
  }
}

/** Trust boundary: anything in, a renderable recipe out. Never throws. */
export function cleanRecipe(raw: unknown): Recipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const layers: Layer[] = [];
  for (const item of Array.isArray(r.layers) ? r.layers : []) {
    if (layers.length >= MAX_LAYERS) break;
    if (!item || typeof item !== "object") continue;
    const src = item as Record<string, unknown>;
    const def = getLayer(src.type);
    if (!def) continue;
    const given = (src.params && typeof src.params === "object" ? src.params : {}) as Record<string, unknown>;
    const params: Params = {};
    for (const c of def.controls) params[c.key] = cleanParam(c, Object.hasOwn(given, c.key) ? given[c.key] : undefined, def.defaults[c.key]);
    const out: Layer = { type: def.id, params };
    if (src.hidden === true) out.hidden = true;
    const opacity = num(src.opacity, 0, 1, 1);
    if (opacity < 1) out.opacity = opacity;
    if (src.blend !== "normal" && (BLENDS as readonly unknown[]).includes(src.blend)) out.blend = src.blend as Blend;
    layers.push(out);
  }
  if (!layers.length) return structuredClone(DEFAULT_RECIPE);
  return { v: 1, seed: Math.floor(num(r.seed, 0, 9999, 0)), frame: num(r.frame, 0, 3_600_000, 0), speed: num(r.speed, 0, 4, 0), layers };
}

export function encodeRecipe(r: Recipe): string {
  return btoa(JSON.stringify(r)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRecipe(s: string | null | undefined): Recipe {
  if (!s || s.length > 20000) return structuredClone(DEFAULT_RECIPE);
  try {
    return cleanRecipe(JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch {
    return structuredClone(DEFAULT_RECIPE);
  }
}

/** CSS stand-in when WebGL is unavailable. Colours are hex-validated by cleanRecipe, so this is safe to put in a style. */
export function cssFallback(r: Recipe): string {
  const cols = r.layers.map((l) => l.params.colors).find((c): c is string[] => Array.isArray(c) && c.length > 0) ?? ["#111111"];
  return `linear-gradient(to top, ${[...cols, cols[cols.length - 1]].join(", ")})`;
}

// Hand-picked palettes: Randomise only varies colour, placement and which layers are stacked,
// never the tuned numeric defaults, so random results stay presentable.
export const PALETTES = [
  ["#03061c", "#1a4fd6", "#a9d0ff"],
  ["#16141f", "#5b4bd6", "#c9a8e8"],
  ["#000000", "#3a0d0d", "#e52e1a", "#ff8a00"],
  ["#0a2a8c", "#2f7bff", "#f4f7ff", "#ff6a1a"],
  ["#fdfbfb", "#ffd9e8", "#cfe9ff", "#fff3c4"],
  ["#2a0a14", "#e8456b", "#ffb3c1"],
  ["#0d2b1f", "#1f6b4a", "#a8e6c1"],
  ["#1b1035", "#7b2ff7", "#f107a3", "#ffd6a5"],
];

export function randomRecipe(seed: number): Recipe {
  let a = seed >>> 0;
  const rnd = () => {
    // mulberry32
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const colors = [...PALETTES[Math.floor(rnd() * PALETTES.length)]];
  const place = () => Math.round((0.2 + rnd() * 0.6) * 100) / 100;
  const base = Math.floor(rnd() * 3);
  const layers = [
    base === 0 ? layer("linear", { colors, angle: Math.floor(rnd() * 361) }) : base === 1 ? layer("radial", { colors, cx: place(), cy: place() }) : layer("mesh", { colors }),
  ];
  if (rnd() < 0.5) layers.push(layer("warp"));
  if (rnd() < 0.3) layers.push(layer("fluted-glass"));
  const t = rnd();
  layers.push(layer(t < 0.7 ? "grain" : t < 0.85 ? "halftone" : "dither"));
  return { v: 1, seed: Math.floor(rnd() * 10000), frame: 0, speed: 0, layers };
}

/** The same recipe with every multi-colour list replaced by `colors` (trimmed to what each layer allows). */
export function withColors(r: Recipe, colors: string[]): Recipe {
  return {
    ...r,
    layers: r.layers.map((l) => {
      const params = { ...l.params };
      for (const c of getLayer(l.type)?.controls ?? []) if (c.type === "color-list" && c.min >= 2 && colors.length >= c.min) params[c.key] = colors.slice(0, c.max);
      return { ...l, params };
    }),
  };
}

/** Randomise while keeping part of the current gradient: "colors" keeps the layers, "layout" keeps the colours. */
export function reroll(r: Recipe, seed: number, what: "all" | "colors" | "layout"): Recipe {
  if (what === "colors") return withColors(r, [...PALETTES[(seed >>> 0) % PALETTES.length]]);
  const next = randomRecipe(seed);
  if (what === "all") return next;
  const mine = r.layers.map((l) => l.params.colors).find((c): c is string[] => Array.isArray(c) && c.length >= 2);
  return mine ? withColors(next, mine) : next;
}

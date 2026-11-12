export type ParamValue = number | string | boolean | string[] | number[];
export type Params = Record<string, ParamValue>;

export type Control =
  | { key: string; label: string; type: "range"; min: number; max: number; step: number }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "color-list"; min: number; max: number }
  /** Flat [x0, y0, x1, y1, …] list set by dragging handles on the preview; empty means "placed by the seed". */
  | { key: string; label: string; type: "points"; max: number };

export type UniformValue = number | number[];

/** A draggable dot on the studio preview. Coordinates are 0..1 with y up, the same space as the shader's uv. */
export type Handle = { x: number; y: number; label: string; color?: string };

export type LayerDef = {
  id: string;
  kind: "base" | "distort" | "surface" | "recolor" | "texture" | "cursor";
  /** True when these params make the layer react to the cursor. Absent means never. */
  interactive?(p: Params): boolean;
  label: string;
  fragment: string;
  defaults: Params;
  controls: Control[];
  uniforms(p: Params): Record<string, UniformValue>;
  /** Optional on-canvas editing: where the handles sit, and the params after one is moved. */
  handles?(p: Params, seed: number): Handle[];
  moveHandle?(p: Params, seed: number, index: number, x: number, y: number): Params;
};

export const MAX_COLORS = 6;

/** Hex colours → the `uColors[6]` / `uColorCount` uniforms declared in common GLSL. */
export function colorUniforms(colors: string[]): { uColors: number[]; uColorCount: number } {
  const uColors: number[] = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    const n = parseInt((colors[Math.min(i, colors.length - 1)] ?? "#000000").slice(1), 16);
    uColors.push(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  return { uColors, uColorCount: Math.max(1, Math.min(colors.length, MAX_COLORS)) };
}

const clampUv = (v: number) => Math.round(Math.min(1.5, Math.max(-0.5, v)) * 1000) / 1000;

/** One handle bound to a pair of x/y range params (a centre point). */
export function centreHandle(kx: string, ky: string, label: string): Pick<LayerDef, "handles" | "moveHandle"> {
  return {
    handles: (p) => [{ x: p[kx] as number, y: p[ky] as number, label }],
    moveHandle: (p, _seed, _i, x, y) => ({ ...p, [kx]: clampUv(x), [ky]: clampUv(y) }),
  };
}

const f32 = Math.fround;
const fract = (x: number) => f32(x - Math.floor(x));

/** The shader's `hash21` in 32-bit float maths, so the studio can show where a seeded point lands. */
export function hash21(x: number, y: number, seed: number): number {
  let a = fract(f32(f32(x + seed) * f32(0.1031)));
  let b = fract(f32(f32(y + seed) * f32(0.1031)));
  let c = a;
  const d = f32(f32(a * f32(b + 33.33)) + f32(b * f32(c + 33.33)) + f32(c * f32(a + 33.33)));
  a = f32(a + d);
  b = f32(b + d);
  c = f32(c + d);
  return fract(f32(f32(a + b) * c));
}

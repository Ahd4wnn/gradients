export type ParamValue = number | string | boolean | string[];
export type Params = Record<string, ParamValue>;

export type Control =
  | { key: string; label: string; type: "range"; min: number; max: number; step: number }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "color-list"; min: number; max: number };

export type UniformValue = number | number[];

export type LayerDef = {
  id: string;
  kind: "base" | "distort" | "surface" | "texture";
  label: string;
  fragment: string;
  defaults: Params;
  controls: Control[];
  uniforms(p: Params): Record<string, UniformValue>;
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

import type { LayerDef } from "./types";

const PATTERNS = ["bayer4", "bayer8", "noise"];

export const dither: LayerDef = {
  id: "dither",
  kind: "texture",
  label: "Dither",
  defaults: { pixel: 4, levels: 4, pattern: "bayer4" },
  controls: [
    { key: "pixel", label: "Pixel size", type: "range", min: 1, max: 24, step: 1 },
    { key: "levels", label: "Colour levels", type: "range", min: 2, max: 8, step: 1 },
    { key: "pattern", label: "Pattern", type: "select", options: PATTERNS },
  ],
  uniforms: (p) => ({ uPixel: p.pixel as number, uLevels: p.levels as number, uPattern: PATTERNS.indexOf(p.pattern as string) }),
  fragment: `
uniform float uPixel, uLevels, uPattern;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
vec4 layer(vec2 uv) {
  float px = max(1.0, floor(uPixel * uRes.y / 1080.0));
  vec2 cell = floor(gl_FragCoord.xy / px);
  vec3 c = texture(uPrev, (cell + 0.5) * px / uRes).rgb;
  float th = uPattern < 0.5 ? bayer4(cell) : uPattern < 1.5 ? bayer8(cell) : hash21(cell);
  float n = uLevels - 1.0;
  return vec4(floor(clamp(c, 0.0, 1.0) * n + th) / n, 1.0);
}`,
};

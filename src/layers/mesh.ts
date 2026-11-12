import { colorUniforms, type LayerDef } from "./types";

export const mesh: LayerDef = {
  id: "mesh",
  kind: "base",
  label: "Mesh blur",
  defaults: { colors: ["#0b1d51", "#1e6bff", "#9fd3ff", "#e8f4ff"], sharpness: 2.5, spread: 1, motion: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "sharpness", label: "Sharpness", type: "range", min: 1, max: 6, step: 0.05 },
    { key: "spread", label: "Spread", type: "range", min: 0, max: 1.6, step: 0.01 },
    { key: "motion", label: "Motion", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uSharpness: p.sharpness as number, uSpread: p.spread as number, uMotion: p.motion as number }),
  fragment: `
uniform float uSharpness, uSpread, uMotion;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= uColorCount) break;
    float fi = float(i);
    vec2 c = 0.5 + (vec2(hash21(vec2(fi, 1.7)), hash21(vec2(fi, 9.2))) - 0.5) * uSpread;
    c += 0.08 * uMotion * vec2(sin(uTime * 0.3 + fi * 2.1), cos(uTime * 0.23 + fi * 1.3));
    vec2 d = (uv - c) * asp;
    float w = pow(dot(d, d) + 0.001, -0.5 * uSharpness);
    acc += w * toOklab(uColors[i]);
    wsum += w;
  }
  return vec4(fromOklab(acc / wsum), 1.0);
}`,
};

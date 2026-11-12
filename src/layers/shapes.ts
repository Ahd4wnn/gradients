import { colorUniforms, type LayerDef } from "./types";

const SHAPES = ["circle", "sparkle", "ring"];

export const shapes: LayerDef = {
  id: "shapes",
  kind: "base",
  label: "Blurred shapes",
  defaults: { colors: ["#eef1ff", "#ff9a8b", "#7aa2ff", "#ffd3a5"], count: 4, size: 0.3, blur: 0.7, shape: "circle", motion: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "count", label: "Shapes", type: "range", min: 1, max: 8, step: 1 },
    { key: "size", label: "Size", type: "range", min: 0.03, max: 0.8, step: 0.01 },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "shape", label: "Shape", type: "select", options: SHAPES },
    { key: "motion", label: "Motion", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uCount: p.count as number, uSize: p.size as number, uBlur: p.blur as number, uShape: SHAPES.indexOf(p.shape as string), uMotion: p.motion as number }),
  fragment: `
uniform float uCount, uSize, uBlur, uShape, uMotion;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = toOklab(uColors[0]); // the first colour is the background
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    float fi = float(i);
    vec2 c = vec2(hash21(vec2(fi, 1.3)), hash21(vec2(fi, 8.1)));
    c += 0.06 * uMotion * vec2(sin(uTime * 0.3 + fi * 2.1), cos(uTime * 0.23 + fi * 1.3));
    vec2 q = (uv - c) * asp;
    float s = uSize * (0.5 + hash21(vec2(fi, 4.4)));
    float d = length(q) - s;
    if (uShape > 1.5) d = abs(length(q) - s) - s * 0.18;
    else if (uShape > 0.5) { float k = sqrt(abs(q.x)) + sqrt(abs(q.y)); d = k * k - s; }
    float soft = max(uBlur * s, 1.5 / uRes.y);
    float cover = 1.0 - smoothstep(-soft, soft, d);
    acc = mix(acc, toOklab(uColors[1 + int(mod(fi, float(uColorCount - 1)))]), cover * (0.6 + 0.4 * hash21(vec2(fi, 6.6))));
  }
  return vec4(fromOklab(acc), 1.0);
}`,
};

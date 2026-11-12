import type { LayerDef } from "./types";

export const warp: LayerDef = {
  id: "warp",
  kind: "distort",
  label: "Liquid swirl",
  defaults: { amount: 0.15, scale: 1.5, detail: 2, flow: 1 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.6, step: 0.005 },
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 6, step: 0.05 },
    { key: "detail", label: "Detail", type: "range", min: 1, max: 4, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uScale: p.scale as number, uDetail: p.detail as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmount, uScale, uDetail, uFlow;
vec4 layer(vec2 uv) {
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * uScale;
  int o = int(uDetail);
  float t = uTime * uFlow * 0.1;
  vec2 q = vec2(fbm(p + vec2(0.0, t), o), fbm(p + vec2(5.2, 1.3 - t), o));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2), o), fbm(p + 3.0 * q + vec2(8.3, 2.8), o));
  return vec4(texture(uPrev, uv + uAmount * r).rgb, 1.0);
}`,
};

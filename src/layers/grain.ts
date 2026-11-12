import type { LayerDef } from "./types";

export const grain: LayerDef = {
  id: "grain",
  kind: "texture",
  label: "Grain",
  defaults: { amount: 0.12, size: 1.5, mode: "film", mono: true },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.5, step: 0.005 },
    { key: "size", label: "Grain size", type: "range", min: 1, max: 6, step: 0.1 },
    { key: "mode", label: "Mode", type: "select", options: ["film", "edge"] },
    { key: "mono", label: "Monochrome", type: "toggle" },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uSize: p.size as number, uEdge: p.mode === "edge" ? 1 : 0, uMono: p.mono ? 1 : 0 }),
  fragment: `
uniform float uAmount, uSize, uEdge, uMono;
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  float cell = max(1.0, uSize * uRes.y / 1080.0);
  vec2 g = floor(gl_FragCoord.xy / cell) + floor(uTime * 12.0) * 7.0;
  vec3 n = vec3(hash21(g), hash21(g + 31.7), hash21(g + 73.1)) - 0.5;
  if (uMono > 0.5) n = vec3(n.x);
  float k = 1.0;
  if (uEdge > 0.5) {
    float l = luma(c);
    k = clamp(length(vec2(dFdx(l), dFdy(l))) * uRes.y * 0.6, 0.0, 1.0);
  }
  return vec4(c + n * uAmount * k, 1.0);
}`,
};

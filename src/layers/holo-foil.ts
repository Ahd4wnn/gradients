import type { LayerDef } from "./types";

export const holoFoil: LayerDef = {
  id: "holo-foil",
  kind: "surface",
  label: "Holographic foil",
  defaults: { amount: 0.85, scale: 1.2, cycles: 2.5, pastel: 0.45, flow: 1 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 6, step: 0.05 },
    { key: "cycles", label: "Colour cycles", type: "range", min: 0.5, max: 8, step: 0.1 },
    { key: "pastel", label: "Pastel", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uScale: p.scale as number, uCycles: p.cycles as number, uPastel: p.pastel as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmount, uScale, uCycles, uPastel, uFlow;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * uScale;
  float t = uTime * uFlow * 0.05;
  vec2 q = vec2(fbm(p + vec2(1.7, 9.2 + t), 2), fbm(p + vec2(8.3 - t, 2.8), 2));
  // film thickness: a slow warped field, a diagonal sweep, and the picture underneath
  float film = fbm(p + 2.0 * q, 3) * uCycles + dot(uv, vec2(0.6, 0.4)) * uCycles * 0.5 + luma(c) * 0.5;
  vec3 holo = mix(spectrum(film), vec3(1.0), uPastel) * (0.8 + 0.25 * luma(c));
  return vec4(mix(c, holo, uAmount), 1.0);
}`,
};

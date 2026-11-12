import type { LayerDef } from "./types";

export const prism: LayerDef = {
  id: "prism",
  kind: "surface",
  label: "Prism streaks",
  defaults: { count: 5, angle: 55, width: 0.05, length: 0.5, dispersion: 0.8, amount: 0.9 },
  controls: [
    { key: "count", label: "Streaks", type: "range", min: 1, max: 8, step: 1 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "width", label: "Width", type: "range", min: 0.005, max: 0.3, step: 0.005 },
    { key: "length", label: "Length", type: "range", min: 0.05, max: 2, step: 0.01 },
    { key: "dispersion", label: "Rainbow", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "amount", label: "Brightness", type: "range", min: 0, max: 2, step: 0.01 },
  ],
  uniforms: (p) => ({ uCount: p.count as number, uAngle: p.angle as number, uWidth: p.width as number, uLength: p.length as number, uDispersion: p.dispersion as number, uAmount: p.amount as number }),
  fragment: `
uniform float uCount, uAngle, uWidth, uLength, uDispersion, uAmount;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    float fi = float(i);
    vec2 c = vec2(hash21(vec2(fi, 3.1)), hash21(vec2(fi, 7.7)));
    float a = radians(uAngle) + (hash21(vec2(fi, 11.9)) - 0.5) * 0.35;
    vec2 d = vec2(cos(a), sin(a));
    vec2 q = (uv - c) * asp;
    float along = dot(q, d), across = dot(q, vec2(-d.y, d.x));
    float w = uWidth * (0.4 + 1.2 * hash21(vec2(fi, 5.3)));
    float len = uLength * (0.5 + hash21(vec2(fi, 2.2)));
    float beam = exp(-across * across / (w * w)) * exp(-along * along / (len * len));
    // light is split across the width of the streak, so one edge is red and the other violet
    vec3 col = mix(vec3(1.0), spectrum(across / w * 0.42 + 0.5) * 1.3, uDispersion);
    acc += col * beam * (0.35 + 0.65 * hash21(vec2(fi, 9.4)));
  }
  return vec4(texture(uPrev, uv).rgb + acc * uAmount, 1.0);
}`,
};

import type { LayerDef } from "./types";

export const melt: LayerDef = {
  id: "melt",
  kind: "distort",
  label: "Melt",
  defaults: { amount: 0.2, frequency: 10, jag: 0.5, angle: 0, flow: 1 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.6, step: 0.005 },
    { key: "frequency", label: "Columns", type: "range", min: 1, max: 60, step: 0.5 },
    { key: "jag", label: "Jaggedness", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uFreq: p.frequency as number, uJag: p.jag as number, uAngle: p.angle as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmount, uFreq, uJag, uAngle, uFlow;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a)), n = vec2(-d.y, d.x);
  float x = dot(p, d) * uFreq;
  float t = uTime * uFlow * 0.1;
  float smoothDrip = fbm(vec2(x * 0.5, t), 3) * 1.6;
  // zigzag: a triangle wave whose every tooth has its own height
  float tooth = abs(fract(x) - 0.5) * 2.0;
  float zig = (1.0 - tooth) * (0.3 + 0.7 * hash21(vec2(floor(x), 2.0))) + fbm(vec2(x * 0.15, 9.0 + t), 2) - 0.5;
  return vec4(texture(uPrev, uv + n / asp * uAmount * mix(smoothDrip, zig, uJag)).rgb, 1.0);
}`,
};

import type { LayerDef } from "./types";

export const satin: LayerDef = {
  id: "satin",
  kind: "surface",
  label: "Satin folds",
  defaults: { folds: 3, amount: 0.6, twist: 0.6, angle: 30, flow: 1 },
  controls: [
    { key: "folds", label: "Folds", type: "range", min: 0.5, max: 12, step: 0.1 },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "twist", label: "Twist", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uFolds: p.folds as number, uAmount: p.amount as number, uTwist: p.twist as number, uAngle: p.angle as number, uFlow: p.flow as number }),
  fragment: `
uniform float uFolds, uAmount, uTwist, uAngle, uFlow;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a));
  float w = fbm(p * 1.3 + vec2(0.0, uTime * uFlow * 0.05), 2) * uTwist;
  float x = dot(p, d) * uFolds + w * 3.0 + sin(dot(p, vec2(-d.y, d.x)) * 2.0 + w * 2.0) * 0.5;
  float sh = 0.5 + 0.5 * sin(x * 3.14159);
  // cloth: the fold bends the picture slightly, valleys darken, ridges catch a soft highlight
  vec3 c = texture(uPrev, uv + d / asp * (sh - 0.5) * 0.04 * uAmount).rgb;
  c *= 1.0 - uAmount * 0.65 * (1.0 - sh) * (1.0 - sh);
  c += uAmount * 0.22 * pow(sh, 8.0);
  return vec4(c, 1.0);
}`,
};

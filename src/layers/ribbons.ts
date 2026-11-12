import type { LayerDef } from "./types";

export const ribbons: LayerDef = {
  id: "ribbons",
  kind: "distort",
  label: "Wave ribbons",
  defaults: { amplitude: 0.15, frequency: 1.2, twist: 0.5, angle: 0, flow: 1 },
  controls: [
    { key: "amplitude", label: "Height", type: "range", min: 0, max: 0.5, step: 0.005 },
    { key: "frequency", label: "Waves", type: "range", min: 0.2, max: 6, step: 0.05 },
    { key: "twist", label: "Twist", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmp: p.amplitude as number, uFreq: p.frequency as number, uTwist: p.twist as number, uAngle: p.angle as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmp, uFreq, uTwist, uAngle, uFlow;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a)), n = vec2(-d.y, d.x);
  float t = uTime * uFlow * 0.3;
  float w = fbm(p * 1.2 + vec2(t * 0.2, 0.0), 2) * uTwist;
  // slide the picture across the wave direction: a flat fade becomes a ribbon
  float wave = sin(dot(p, d) * uFreq * 6.2831853 + w * 4.0 + t) + 0.25 * sin(dot(p, d) * uFreq * 2.3 * 6.2831853 + w * 5.0 - t);
  return vec4(texture(uPrev, uv + n / asp * uAmp * (wave * 0.8 + w)).rgb, 1.0);
}`,
};

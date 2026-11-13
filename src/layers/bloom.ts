import type { LayerDef } from "./types";

export const bloom: LayerDef = {
  id: "bloom",
  kind: "texture",
  label: "Bloom",
  defaults: { threshold: 0.6, radius: 0.06, amount: 0.8 },
  controls: [
    { key: "threshold", label: "Glow from", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "radius", label: "Spread", type: "range", min: 0.005, max: 0.25, step: 0.005 },
    { key: "amount", label: "Strength", type: "range", min: 0, max: 2, step: 0.01 },
  ],
  uniforms: (p) => ({ uThreshold: p.threshold as number, uRadius: p.radius as number, uAmount: p.amount as number }),
  fragment: `
uniform float uThreshold, uRadius, uAmount;
vec3 bright(vec2 p) {
  vec3 s = max(texture(uPrev, p).rgb, 0.0);
  return s * smoothstep(uThreshold, uThreshold + 0.25, luma(s));
}
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  vec2 asp = vec2(uRes.y / uRes.x, 1.0);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  // 48 taps on a golden-angle spiral cover the disc evenly; turning the spiral per pixel
  // trades the ring pattern a fixed spiral leaves for fine noise, which the eye ignores
  float rot = hash21(gl_FragCoord.xy) * 6.2831853;
  for (int i = 0; i < 48; i++) {
    float fi = float(i) + 0.5;
    float r = sqrt(fi / 48.0);
    float a = fi * 2.3999632 + rot;
    float w = exp(-r * r * 3.0);
    acc += bright(uv + vec2(cos(a), sin(a)) * r * uRadius * asp) * w;
    wsum += w;
  }
  return vec4(c + acc / wsum * uAmount, 1.0);
}`,
};

import type { LayerDef } from "./types";

export const chrome: LayerDef = {
  id: "chrome",
  kind: "surface",
  label: "Liquid chrome",
  defaults: { scale: 0.8, depth: 1, streaks: 2, iris: 0.6, tint: 0.25, flow: 1 },
  controls: [
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 5, step: 0.05 },
    { key: "depth", label: "Depth", type: "range", min: 0.1, max: 3, step: 0.05 },
    { key: "streaks", label: "Reflections", type: "range", min: 0.5, max: 6, step: 0.1 },
    { key: "iris", label: "Rainbow edge", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "tint", label: "Colour from below", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uScale: p.scale as number, uDepth: p.depth as number, uStreaks: p.streaks as number, uIris: p.iris as number, uTint: p.tint as number, uFlow: p.flow as number }),
  fragment: `
uniform float uScale, uDepth, uStreaks, uIris, uTint, uFlow;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
float height(vec2 p) {
  float t = uTime * uFlow * 0.06;
  vec2 q = vec2(fbm(p + vec2(0.0, t), 2), fbm(p + vec2(5.2, 1.3 - t), 2));
  // one octave only: chrome is big smooth folds, and every extra octave turns it into oil on water
  return gnoise(p + 1.6 * q);
}
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = uv * asp * uScale;
  float e = 0.02;
  float h = height(p);
  vec2 g = vec2(height(p + vec2(e, 0.0)) - h, height(p + vec2(0.0, e)) - h) / e;
  vec3 n = normalize(vec3(-g * uDepth * 0.6, 1.0));
  // a striped "studio" reflected in the surface: bright strips on black
  float r = n.x * 1.3 + n.y * 0.8;
  float strip = 0.5 + 0.5 * sin(r * uStreaks * 3.14159 + h * 2.0);
  float light = pow(strip, 9.0);
  vec3 below = texture(uPrev, uv + n.xy * 0.06 / asp).rgb;
  vec3 body = mix(vec3(0.03, 0.03, 0.05), below, uTint) * (0.15 + 0.85 * strip * strip);
  // the rainbow sits on the shoulders of each highlight, where a thin film splits light
  float shoulder = pow(strip, 3.0) * (1.0 - light);
  vec3 col = body + vec3(light) + spectrum(r * 0.9 + h * 0.8) * shoulder * uIris * 1.1;
  return vec4(col, 1.0);
}`,
};

import type { LayerDef } from "./types";

export const flutedGlass: LayerDef = {
  id: "fluted-glass",
  kind: "surface",
  label: "Fluted glass",
  defaults: { count: 24, strength: 3, angle: 0, shade: 0.25 },
  controls: [
    { key: "count", label: "Ridges", type: "range", min: 4, max: 120, step: 1 },
    { key: "strength", label: "Refraction", type: "range", min: 0, max: 10, step: 0.05 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "shade", label: "Shading", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ uCount: p.count as number, uStrength: p.strength as number, uAngle: p.angle as number, uShade: p.shade as number }),
  fragment: `
uniform float uCount, uStrength, uAngle, uShade;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a));
  float f = fract(dot((uv - 0.5) * asp, d) * uCount) - 0.5;
  vec3 c = texture(uPrev, uv + d / asp * (f * uStrength / uCount)).rgb;
  c *= 1.0 - uShade * abs(f);
  c += uShade * 0.15 * smoothstep(0.3, 0.5, f);
  return vec4(c, 1.0);
}`,
};

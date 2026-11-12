import type { LayerDef } from "./types";

export const tiledGlass: LayerDef = {
  id: "tiled-glass",
  kind: "surface",
  label: "Tiled glass",
  defaults: { count: 12, shift: 1.4, lens: 0.8, bevel: 0.1, angle: 0 },
  controls: [
    { key: "count", label: "Tiles", type: "range", min: 2, max: 60, step: 1 },
    { key: "shift", label: "Tile offset", type: "range", min: 0, max: 3, step: 0.01 },
    { key: "lens", label: "Lens", type: "range", min: -2, max: 2, step: 0.01 },
    { key: "bevel", label: "Bevel", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 90, step: 1 },
  ],
  uniforms: (p) => ({ uCount: p.count as number, uShift: p.shift as number, uLens: p.lens as number, uBevel: p.bevel as number, uAngle: p.angle as number }),
  fragment: `
uniform float uCount, uShift, uLens, uBevel, uAngle;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float a = radians(uAngle);
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 g = rot * ((uv - 0.5) * asp) * uCount;
  vec2 id = floor(g), f = fract(g) - 0.5;
  // each tile shows the picture from a slightly different place, and bends it like a small lens
  vec2 off = (vec2(hash21(id), hash21(id + 7.3)) - 0.5) * uShift - f * uLens;
  vec3 c = texture(uPrev, uv + transpose(rot) * off / uCount / asp).rgb;
  float edge = max(abs(f.x), abs(f.y));
  c *= 1.0 - uBevel * smoothstep(0.4, 0.5, edge);
  c += uBevel * 0.12 * smoothstep(0.3, 0.5, f.y) * smoothstep(0.5, 0.4, edge);
  return vec4(c, 1.0);
}`,
};

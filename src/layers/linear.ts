import { colorUniforms, type LayerDef } from "./types";

export const linear: LayerDef = {
  id: "linear",
  kind: "base",
  label: "Horizon fade",
  defaults: { colors: ["#a9d0ff", "#1a4fd6", "#03061c"], angle: 0, bend: 0, spread: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 360, step: 1 },
    { key: "bend", label: "Bend", type: "range", min: -2, max: 2, step: 0.01 },
    { key: "spread", label: "Spread", type: "range", min: 0.2, max: 2, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uAngle: p.angle as number, uBend: p.bend as number, uSpread: p.spread as number }),
  fragment: `
uniform float uAngle, uBend, uSpread;
vec4 layer(vec2 uv) {
  vec2 p = uv - 0.5;
  float a = radians(uAngle);
  vec2 d = vec2(sin(a), cos(a));
  float side = dot(p, vec2(d.y, -d.x));
  float t = dot(p, d) + uBend * side * side;
  return vec4(palette(t / uSpread + 0.5), 1.0);
}`,
};

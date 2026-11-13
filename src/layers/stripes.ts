import { PICK } from "./glsl";
import { centreHandle, colorUniforms, type LayerDef } from "./types";

const MODES = ["stripes", "sunburst"];

export const stripes: LayerDef = {
  id: "stripes",
  kind: "base",
  label: "Retro stripes",
  defaults: { colors: ["#2b1407", "#c4471a", "#f29e38", "#f6d8a8"], mode: "stripes", count: 10, angle: 20, cx: 0.5, cy: 0.5, bend: 0.3, soft: 0 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "mode", label: "Style", type: "select", options: MODES },
    { key: "count", label: "Stripes", type: "range", min: 2, max: 60, step: 1 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "cx", label: "Centre X", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "cy", label: "Centre Y", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "bend", label: "Bend", type: "range", min: -1, max: 1, step: 0.01 },
    { key: "soft", label: "Edge blur", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  ...centreHandle("cx", "cy", "Centre"),
  uniforms: (p) => ({
    ...colorUniforms(p.colors as string[]),
    uMode: MODES.indexOf(p.mode as string),
    uCount: p.count as number,
    uAngle: p.angle as number,
    uCenter: [p.cx as number, p.cy as number],
    uBend: p.bend as number,
    uSoft: p.soft as number,
  }),
  fragment: `${PICK}
uniform vec2 uCenter;
uniform float uMode, uCount, uAngle, uBend, uSoft;
vec4 layer(vec2 uv) {
  vec2 q = (uv - uCenter) * vec2(uRes.x / uRes.y, 1.0);
  float a = radians(uAngle);
  float x, fw;
  if (uMode < 0.5) {
    vec2 d = vec2(cos(a), sin(a));
    float side = dot(q, vec2(-d.y, d.x));
    x = (dot(q, d) + uBend * side * side) * uCount;
    fw = fwidth(x);
  } else {
    float r = max(length(q), 1e-4);
    x = (atan(q.y, q.x) + a + uBend * r * 3.0) / 6.2831853 * uCount;
    // worked out directly: fwidth would see the jump where atan wraps and smear a seam
    fw = uCount / (6.2831853 * r * uRes.y);
  }
  float aa = clamp(fw + uSoft * 0.5, 1e-4, 0.5);
  float s = x - 0.5;
  float i = floor(s);
  return vec4(mixOk(pick(i), pick(i + 1.0), smoothstep(0.5 - aa, 0.5 + aa, fract(s))), 1.0);
}`,
};

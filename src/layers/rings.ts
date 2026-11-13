import { PICK } from "./glsl";
import { centreHandle, colorUniforms, type LayerDef } from "./types";

export const rings: LayerDef = {
  id: "rings",
  kind: "base",
  label: "Rings and arcs",
  defaults: { colors: ["#12082e", "#5b2ff7", "#f107a3", "#ffb347"], cx: 0.5, cy: 0, count: 6, fade: 0.6, stretch: 1, tighten: 1, repeat: true },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "cx", label: "Centre X", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "cy", label: "Centre Y", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "count", label: "Rings", type: "range", min: 1, max: 30, step: 0.5 },
    { key: "fade", label: "Fade", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "stretch", label: "Stretch", type: "range", min: 0.25, max: 4, step: 0.01 },
    { key: "tighten", label: "Tighten outward", type: "range", min: 1, max: 6, step: 0.05 },
    { key: "repeat", label: "Repeat colours", type: "toggle" },
  ],
  ...centreHandle("cx", "cy", "Centre"),
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uCenter: [p.cx as number, p.cy as number], uCount: p.count as number, uFade: p.fade as number, uStretch: p.stretch as number, uTighten: p.tighten as number, uRepeat: p.repeat ? 1 : 0 }),
  fragment: `${PICK}
uniform vec2 uCenter;
uniform float uCount, uFade, uStretch, uTighten, uRepeat;
vec4 layer(vec2 uv) {
  vec2 q = (uv - uCenter) * vec2(uRes.x / uRes.y / uStretch, 1.0);
  float d = length(q);
  // tighten above 1: the first band is wide and each one after is thinner (skipped at 1 so existing gradients are unchanged)
  if (uTighten != 1.0) d = pow(d, uTighten);
  float r = d * uCount;
  float i = floor(r), f = fract(r);
  // repeat off: the last colour fills everything past it instead of starting the list again
  float last = float(uColorCount - 1);
  if (uRepeat < 0.5 && i >= last) return vec4(uColors[uColorCount - 1], 1.0);
  // fade 0: flat bands with a crisp edge. fade 1: each ring melts evenly into the next.
  float k = pow(f, mix(40.0, 1.0, uFade));
  return vec4(mixOk(pick(i), pick(i + 1.0), k), 1.0);
}`,
};

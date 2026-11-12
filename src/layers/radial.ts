import { colorUniforms, type LayerDef } from "./types";

export const radial: LayerDef = {
  id: "radial",
  kind: "base",
  label: "Aura glow",
  defaults: { colors: ["#ffb347", "#ff7eb3", "#ffe1ee"], cx: 0.5, cy: 0.5, radius: 0.7, stretch: 1, falloff: 1, follow: 0 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "cx", label: "Centre X", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "cy", label: "Centre Y", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "radius", label: "Radius", type: "range", min: 0.05, max: 2, step: 0.01 },
    { key: "stretch", label: "Stretch", type: "range", min: 0.25, max: 4, step: 0.01 },
    { key: "falloff", label: "Falloff", type: "range", min: 0.3, max: 3, step: 0.01 },
    { key: "follow", label: "Follow cursor", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({
    ...colorUniforms(p.colors as string[]),
    uCenter: [p.cx as number, p.cy as number],
    uRadius: p.radius as number,
    uStretch: p.stretch as number,
    uFalloff: p.falloff as number,
    uFollow: p.follow as number,
  }),
  interactive: (p) => (p.follow as number) > 0,
  fragment: `
uniform vec2 uCenter;
uniform float uRadius, uStretch, uFalloff, uFollow;
vec4 layer(vec2 uv) {
  vec2 centre = uCenter + (uPointer - uCenter) * uFollow * uHover * 0.5;
  vec2 p = (uv - centre) * vec2(uRes.x / uRes.y / uStretch, 1.0);
  return vec4(palette(pow(clamp(length(p) / uRadius, 0.0, 1.0), uFalloff)), 1.0);
}`,
};

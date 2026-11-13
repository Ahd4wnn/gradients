import { colorUniforms, type LayerDef } from "./types";

export const thermal: LayerDef = {
  id: "thermal",
  kind: "recolor",
  label: "Thermal contour",
  defaults: { colors: ["#0a0a3a", "#4b0fa0", "#d1206c", "#ff7a1a", "#ffe066", "#ffffff"], bands: 12, lines: 0.5, smooth: 0.2 },
  controls: [
    { key: "colors", label: "Heat colours, cold to hot", type: "color-list", min: 2, max: 6 },
    { key: "bands", label: "Bands", type: "range", min: 2, max: 40, step: 1 },
    { key: "lines", label: "Contour lines", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "smooth", label: "Smoothness", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uBands: p.bands as number, uLines: p.lines as number, uSmooth: p.smooth as number }),
  fragment: `
uniform float uBands, uLines, uSmooth;
vec4 layer(vec2 uv) {
  float x = clamp(luma(clamp(texture(uPrev, uv).rgb, 0.0, 1.0)), 0.0, 1.0) * uBands;
  float fw = max(fwidth(x), 1e-4);
  // flat bands that step at whole numbers of x, antialiased over about a pixel
  float s = x - 0.5;
  float stepped = (floor(s) + smoothstep(0.5 - fw, 0.5 + fw, fract(s)) + 0.5) / uBands;
  vec3 col = palette(clamp(mix(stepped, x / uBands, uSmooth), 0.0, 1.0));
  // thin dark lines on the band edges, like the isolines on a weather map
  float edge = abs(fract(x + 0.5) - 0.5);
  col *= 1.0 - 0.7 * uLines * (1.0 - smoothstep(0.0, fw * 1.2, edge));
  return vec4(col, 1.0);
}`,
};

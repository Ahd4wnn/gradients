import { colorUniforms, type LayerDef } from "./types";

export const gradientMap: LayerDef = {
  id: "gradient-map",
  kind: "recolor",
  label: "Gradient map",
  defaults: { colors: ["#0b0630", "#5b2ff7", "#ff5f8f", "#ffd6a5"], contrast: 1, shift: 0, amount: 1 },
  controls: [
    { key: "colors", label: "Colours, dark to light", type: "color-list", min: 2, max: 6 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.2, max: 3, step: 0.01 },
    { key: "shift", label: "Shift", type: "range", min: -0.5, max: 0.5, step: 0.01 },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uContrast: p.contrast as number, uShift: p.shift as number, uAmount: p.amount as number }),
  fragment: `
uniform float uContrast, uShift, uAmount;
vec4 layer(vec2 uv) {
  vec3 c = clamp(texture(uPrev, uv).rgb, 0.0, 1.0);
  // brightness picks a place on the colour list: shadows take the first colour, highlights the last
  float t = clamp((luma(c) - 0.5) * uContrast + 0.5 + uShift, 0.0, 1.0);
  return vec4(fromOklab(mix(toOklab(c), toOklab(palette(t)), uAmount)), 1.0);
}`,
};

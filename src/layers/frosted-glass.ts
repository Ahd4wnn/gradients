import { colorUniforms, type LayerDef } from "./types";

export const frostedGlass: LayerDef = {
  id: "frosted-glass",
  kind: "surface",
  label: "Frosted glass",
  defaults: { colors: ["#ffffff"], blur: 0.06, frost: 0.6, milk: 0.15 },
  controls: [
    { key: "colors", label: "Glass tint", type: "color-list", min: 1, max: 1 },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 0.25, step: 0.005 },
    { key: "frost", label: "Frost", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "milk", label: "Milkiness", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uBlur: p.blur as number, uFrost: p.frost as number, uMilk: p.milk as number }),
  fragment: `
uniform float uBlur, uFrost, uMilk;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  // 24 samples on a golden-angle spiral; turning the spiral per pixel trades banding for a fine frosted sparkle
  float turn = hash21(gl_FragCoord.xy) * 6.2831853 * uFrost;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 24.0) * uBlur;
    float a = fi * 2.39996323 + turn;
    acc += texture(uPrev, uv + r * vec2(cos(a), sin(a)) / asp).rgb;
  }
  return vec4(mix(acc / 24.0, uColors[0], uMilk * 0.7), 1.0);
}`,
};

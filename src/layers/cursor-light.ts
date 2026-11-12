import { colorUniforms, type LayerDef } from "./types";

export const cursorLight: LayerDef = {
  id: "cursor-light",
  kind: "cursor",
  label: "Spotlight",
  interactive: () => true,
  defaults: { colors: ["#ffffff"], strength: 0.35, radius: 0.35 },
  controls: [
    { key: "colors", label: "Light colour", type: "color-list", min: 1, max: 1 },
    { key: "strength", label: "Brightness", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "radius", label: "Size", type: "range", min: 0.05, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uStrength: p.strength as number, uRadius: p.radius as number }),
  fragment: `
uniform float uStrength, uRadius;
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  vec2 d = (uv - uPointer) * vec2(uRes.x / uRes.y, 1.0);
  float fall = exp(-dot(d, d) / (uRadius * uRadius));
  // screen blend: lifts dark areas a lot and bright areas a little, so it never clips to flat white.
  // Written as "c plus something" so that with no cursor it returns c exactly, bit for bit.
  return vec4(c + (1.0 - clamp(c, 0.0, 1.0)) * uColors[0] * uStrength * fall * uHover, 1.0);
}`,
};

import { colorUniforms, type LayerDef } from "./types";

export const halftone: LayerDef = {
  id: "halftone",
  kind: "texture",
  label: "Halftone dots",
  defaults: { colors: ["#f5efe6"], pitch: 10, angle: 45, soft: 0.05, invert: false },
  controls: [
    { key: "colors", label: "Paper colour", type: "color-list", min: 1, max: 1 },
    { key: "pitch", label: "Dot spacing", type: "range", min: 4, max: 60, step: 0.5 },
    { key: "angle", label: "Screen angle", type: "range", min: 0, max: 90, step: 1 },
    { key: "soft", label: "Softness", type: "range", min: 0, max: 0.3, step: 0.005 },
    { key: "invert", label: "Light dots", type: "toggle" },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uPitch: p.pitch as number, uAngle: p.angle as number, uSoft: p.soft as number, uInvert: p.invert ? 1 : 0 }),
  fragment: `
uniform float uPitch, uAngle, uSoft, uInvert;
vec4 layer(vec2 uv) {
  float a = radians(uAngle);
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  float pitch = max(2.0, uPitch * uRes.y / 1080.0);
  vec2 g = rot * gl_FragCoord.xy / pitch;
  vec2 centre = transpose(rot) * (floor(g) + 0.5) * pitch;
  vec3 src = texture(uPrev, centre / uRes).rgb;
  float m = uInvert > 0.5 ? luma(src) : 1.0 - luma(src);
  float r = sqrt(clamp(m, 0.0, 1.0)) * 0.72;
  float edge = uSoft + 1.0 / pitch;
  float cover = 1.0 - smoothstep(r - edge, r + edge, length(fract(g) - 0.5));
  return vec4(mix(uColors[0], src, cover), 1.0);
}`,
};

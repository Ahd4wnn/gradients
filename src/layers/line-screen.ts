import { colorUniforms, type LayerDef } from "./types";

export const lineScreen: LayerDef = {
  id: "line-screen",
  kind: "texture",
  label: "Line screen",
  defaults: { colors: ["#f5efe6"], spacing: 9, angle: 30, wave: 0.2, soft: 0.05, invert: false },
  controls: [
    { key: "colors", label: "Paper colour", type: "color-list", min: 1, max: 1 },
    { key: "spacing", label: "Line spacing", type: "range", min: 3, max: 60, step: 0.5 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "wave", label: "Wave", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "soft", label: "Softness", type: "range", min: 0, max: 0.3, step: 0.005 },
    { key: "invert", label: "Light lines", type: "toggle" },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uSpacing: p.spacing as number, uAngle: p.angle as number, uWave: p.wave as number, uSoft: p.soft as number, uInvert: p.invert ? 1 : 0 }),
  fragment: `
uniform float uSpacing, uAngle, uWave, uSoft, uInvert;
vec4 layer(vec2 uv) {
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a));
  float pitch = max(2.0, uSpacing * uRes.y / 1080.0);
  float along = dot(gl_FragCoord.xy, d);
  float across = dot(gl_FragCoord.xy, vec2(-d.y, d.x)) + uWave * pitch * 3.0 * sin(along / (pitch * 8.0));
  vec3 src = texture(uPrev, uv).rgb;
  // dark areas get thick lines and light areas thin ones, like an engraving
  float m = clamp(uInvert > 0.5 ? luma(src) : 1.0 - luma(src), 0.0, 1.0);
  float w = m * 0.5;
  float dist = abs(fract(across / pitch) - 0.5);
  float edge = uSoft + 1.0 / pitch;
  // the second factor fades a line out as it thins to nothing, so pure highlights stay clean paper
  float cover = (1.0 - smoothstep(w - edge, w + edge, dist)) * smoothstep(0.0, edge, w);
  return vec4(mix(uColors[0], src, cover), 1.0);
}`,
};

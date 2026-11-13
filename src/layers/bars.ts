import { PICK } from "./glsl";
import { colorUniforms, type LayerDef } from "./types";

export const bars: LayerDef = {
  id: "bars",
  kind: "base",
  label: "Gradient bars",
  defaults: { colors: ["#0b0b2a", "#3b2bd6", "#ff4fa3", "#ffd2a1"], bars: 12, angle: 0, stagger: 0.4, ramp: 1, soft: 0.1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "bars", label: "Bars", type: "range", min: 2, max: 60, step: 1 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "stagger", label: "Stagger", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "ramp", label: "Ramp length", type: "range", min: 0.3, max: 3, step: 0.01 },
    { key: "soft", label: "Edge blur", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uBars: p.bars as number, uAngle: p.angle as number, uStagger: p.stagger as number, uRamp: p.ramp as number, uSoft: p.soft as number }),
  fragment: `${PICK}
uniform float uBars, uAngle, uStagger, uRamp, uSoft;
vec3 barColour(float i, float y) {
  return palette((y - 0.5) / uRamp + 0.5 + (hash21(vec2(i, 3.7)) - 0.5) * uStagger);
}
vec4 layer(vec2 uv) {
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float a = radians(uAngle);
  vec2 across = vec2(cos(a), sin(a)), along = vec2(-across.y, across.x);
  float x = dot(q, across) * uBars;
  float y = dot(q, along) + 0.5;
  float i = floor(x), f = fract(x);
  // each bar is its own gradient, slid up or down; neighbours meet at a soft or crisp edge
  float n = f < 0.5 ? i - 1.0 : i + 1.0;
  float e = min(f, 1.0 - f);
  float k = 0.5 * (1.0 - smoothstep(0.0, uSoft * 0.5 + fwidth(x), e));
  return vec4(mixOk(barColour(i, y), barColour(n, y), k), 1.0);
}`,
};

import { PICK } from "./glsl";
import { colorUniforms, type LayerDef } from "./types";

export const waves: LayerDef = {
  id: "waves",
  kind: "base",
  label: "Layered waves",
  defaults: { colors: ["#1b0f3b", "#5a2a8c", "#e2577a", "#ffb38a", "#ffe7c7"], count: 6, height: 0.06, frequency: 3, soft: 0.1, shadow: 0.4, flow: 0.5 },
  controls: [
    { key: "colors", label: "Colours, front to back", type: "color-list", min: 2, max: 6 },
    { key: "count", label: "Layers", type: "range", min: 2, max: 12, step: 1 },
    { key: "height", label: "Wave height", type: "range", min: 0, max: 0.3, step: 0.005 },
    { key: "frequency", label: "Waves", type: "range", min: 0.5, max: 12, step: 0.1 },
    { key: "soft", label: "Edge blur", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "shadow", label: "Shadow", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({
    ...colorUniforms(p.colors as string[]),
    uCount: p.count as number,
    uAmp: p.height as number,
    uFreq: p.frequency as number,
    uSoft: p.soft as number,
    uShadow: p.shadow as number,
    uFlow: p.flow as number,
  }),
  fragment: `${PICK}
uniform float uCount, uAmp, uFreq, uSoft, uShadow, uFlow;
vec4 layer(vec2 uv) {
  float x = uv.x * uRes.x / uRes.y;
  float aa = 1.5 / uRes.y + uSoft * 0.03;
  vec3 col = palette(0.0);
  // paper-cut layers, painted from the front (bottom) to the back (top); each back layer sits
  // above a wavy edge and is shaded just above it, where the layer in front casts its shadow
  for (int k = 0; k < 12; k++) {
    if (float(k) >= uCount) break;
    float fk = float(k);
    float ph = hash21(vec2(fk, 4.2)) * 6.2831853 + uTime * uFlow * 0.3 * (0.5 + hash21(vec2(fk, 8.1)));
    float fr = uFreq * (0.7 + 0.6 * hash21(vec2(fk, 1.3)));
    float e = (fk + 1.0) / (uCount + 1.0) + uAmp * (sin(x * fr + ph) + 0.4 * sin(x * fr * 2.3 + ph * 1.7));
    float above = smoothstep(e - aa, e + aa, uv.y);
    float shade = uShadow * 0.5 * exp(-max(uv.y - e, 0.0) * 40.0);
    col = mixOk(col, palette((fk + 1.0) / uCount) * (1.0 - shade), above);
  }
  return vec4(col, 1.0);
}`,
};

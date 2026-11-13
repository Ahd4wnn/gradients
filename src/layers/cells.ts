import { PICK, VORO } from "./glsl";
import { colorUniforms, type LayerDef } from "./types";

export const cells: LayerDef = {
  id: "cells",
  kind: "base",
  label: "Cells",
  defaults: { colors: ["#0b0b14", "#3a1c71", "#d76d77", "#ffaf7b"], scale: 6, gap: 0.04, shade: 0.45, flow: 0.5 },
  controls: [
    { key: "colors", label: "Colours (first fills the gaps)", type: "color-list", min: 2, max: 6 },
    { key: "scale", label: "Cells", type: "range", min: 1.5, max: 30, step: 0.1 },
    { key: "gap", label: "Gap", type: "range", min: 0, max: 0.3, step: 0.005 },
    { key: "shade", label: "Bevel", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flow", label: "Motion", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uScale: p.scale as number, uGap: p.gap as number, uShade: p.shade as number, uFlow: p.flow as number }),
  fragment: `${VORO}${PICK}
uniform float uScale, uGap, uShade, uFlow;
vec4 layer(vec2 uv) {
  vec3 v = voro(uv * vec2(uRes.x / uRes.y, 1.0) * uScale, uTime * uFlow * 0.5);
  vec3 col = palette(v.z);
  // darker toward each cell's border, so cells look domed like pressed glass
  col *= 1.0 - uShade * 0.6 * (1.0 - smoothstep(0.0, 0.45, v.y));
  float px = uScale * 1.5 / uRes.y; // about one pixel, in cell units
  return vec4(mixOk(uColors[0], col, smoothstep(uGap, uGap + px, v.y)), 1.0);
}`,
};

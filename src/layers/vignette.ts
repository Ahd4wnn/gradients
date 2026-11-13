import { PICK } from "./glsl";
import { colorUniforms, type LayerDef } from "./types";

export const vignette: LayerDef = {
  id: "vignette",
  kind: "texture",
  label: "Vignette",
  defaults: { colors: ["#000000"], amount: 0.6, size: 0.75, softness: 0.6, roundness: 0.5 },
  controls: [
    { key: "colors", label: "Edge colour", type: "color-list", min: 1, max: 1 },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "size", label: "Clear area", type: "range", min: 0, max: 1.5, step: 0.01 },
    { key: "softness", label: "Softness", type: "range", min: 0.05, max: 1.5, step: 0.01 },
    { key: "roundness", label: "Roundness", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uAmount: p.amount as number, uSize: p.size as number, uSoft: p.softness as number, uRound: p.roundness as number }),
  fragment: `${PICK}
uniform float uAmount, uSize, uSoft, uRound;
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  // roundness 0 follows the frame (an oval on a wide image), 1 is a true circle
  vec2 q = (uv - 0.5) * 2.0 * mix(vec2(1.0), vec2(uRes.x / uRes.y, 1.0), uRound);
  float v = smoothstep(uSize, uSize + uSoft, length(q));
  return vec4(mixOk(c, uColors[0], v * uAmount), 1.0);
}`,
};

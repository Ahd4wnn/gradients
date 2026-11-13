import { VORO } from "./glsl";
import { colorUniforms, type LayerDef } from "./types";

export const caustics: LayerDef = {
  id: "caustics",
  kind: "base",
  label: "Water caustics",
  defaults: { colors: ["#021b2e", "#0a5f82", "#2fb8cf", "#d8fbff"], scale: 4, sharpness: 3, amount: 1, flow: 1 },
  controls: [
    { key: "colors", label: "Colours, deep to light", type: "color-list", min: 2, max: 6 },
    { key: "scale", label: "Scale", type: "range", min: 1, max: 14, step: 0.1 },
    { key: "sharpness", label: "Sharpness", type: "range", min: 1, max: 8, step: 0.05 },
    { key: "amount", label: "Light", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uScale: p.scale as number, uSharp: p.sharpness as number, uAmount: p.amount as number, uFlow: p.flow as number }),
  fragment: `${VORO}
uniform float uScale, uSharp, uAmount, uFlow;
vec4 layer(vec2 uv) {
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * uScale;
  float t = uTime * uFlow * 0.4;
  // a gentle wobble so the light network is not a clean cell diagram
  p += 0.35 * vec2(fbm(p * 0.5 + t * 0.3, 2), fbm(p * 0.5 + 7.3 - t * 0.3, 2));
  // caustic light gathers along cell borders; two scales overlap like real ripples do
  float a = 1.0 - clamp(voro(p, t).y * 1.4, 0.0, 1.0);
  float b = 1.0 - clamp(voro(p * 1.7 + 3.1, t * 1.3).y * 1.4, 0.0, 1.0);
  float light = pow(a, uSharp) + 0.6 * pow(b, uSharp);
  float depth = clamp(uv.y * 0.45 + 0.1 + 0.1 * fbm(p * 0.3, 2), 0.0, 1.0);
  return vec4(palette(clamp(depth + light * 0.5 * uAmount, 0.0, 1.0)), 1.0);
}`,
};

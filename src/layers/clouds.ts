import { PICK } from "./glsl";
import { colorUniforms, type LayerDef } from "./types";

export const clouds: LayerDef = {
  id: "clouds",
  kind: "base",
  label: "Clouds",
  defaults: { colors: ["#eaf4ff", "#8fc3ff", "#2f6fd6"], cloud: ["#ffffff"], cover: 0.5, softness: 0.35, scale: 1.6, flow: 0.5 },
  controls: [
    { key: "colors", label: "Sky, bottom to top", type: "color-list", min: 2, max: 6 },
    { key: "cloud", label: "Cloud colour", type: "color-list", min: 1, max: 1 },
    { key: "cover", label: "Cover", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "softness", label: "Softness", type: "range", min: 0.02, max: 1, step: 0.01 },
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 6, step: 0.05 },
    { key: "flow", label: "Drift speed", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({
    ...colorUniforms(p.colors as string[]),
    uCloud: colorUniforms(p.cloud as string[]).uColors.slice(0, 3),
    uCover: p.cover as number,
    uSoft: p.softness as number,
    uScale: p.scale as number,
    uFlow: p.flow as number,
  }),
  fragment: `${PICK}
uniform vec3 uCloud;
uniform float uCover, uSoft, uScale, uFlow;
vec4 layer(vec2 uv) {
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * uScale;
  float t = uTime * uFlow * 0.05;
  // domain-warped noise: billows fold into each other instead of sitting as round blobs
  vec2 q = vec2(fbm(p + vec2(t, 0.0), 4), fbm(p + vec2(4.7, 1.9) - t, 4));
  float n = fbm(p + 1.6 * q + vec2(t * 2.0, 0.0), 4) + 0.5;
  float d = smoothstep(1.0 - uCover - uSoft * 0.5, 1.0 - uCover + uSoft * 0.5, n);
  vec3 sky = palette(uv.y);
  // thick cloud is a touch darker underneath, which is what makes it read as volume
  vec3 cloud = mixOk(uCloud, sky, clamp(0.35 - 0.3 * n, 0.0, 0.35));
  return vec4(mixOk(sky, cloud, d), 1.0);
}`,
};

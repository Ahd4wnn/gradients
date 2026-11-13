import type { LayerDef } from "./types";

export const colorAdjust: LayerDef = {
  id: "color-adjust",
  kind: "recolor",
  label: "Colour adjust",
  defaults: { hue: 0, saturation: 1.15, exposure: 0, contrast: 1.1, temperature: 0 },
  controls: [
    { key: "hue", label: "Hue shift", type: "range", min: -180, max: 180, step: 1 },
    { key: "saturation", label: "Saturation", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "exposure", label: "Exposure", type: "range", min: -2, max: 2, step: 0.01 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2, step: 0.01 },
    { key: "temperature", label: "Warmth", type: "range", min: -1, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ uHue: p.hue as number, uSat: p.saturation as number, uExposure: p.exposure as number, uContrast: p.contrast as number, uTemp: p.temperature as number }),
  fragment: `
uniform float uHue, uSat, uExposure, uContrast, uTemp;
vec4 layer(vec2 uv) {
  vec3 c = clamp(texture(uPrev, uv).rgb, 0.0, 1.0);
  // exposure and white balance act on light, so they happen in linear RGB (stops, like a camera)
  vec3 lin = toLinear(c) * exp2(uExposure) * vec3(1.0 + 0.15 * uTemp, 1.0, 1.0 - 0.15 * uTemp);
  vec3 lab = toOklab(clamp(toSrgb(lin), 0.0, 1.0));
  // hue, saturation and contrast act on perception, so they happen in OKLab
  float a = radians(uHue);
  lab.yz = mat2(cos(a), sin(a), -sin(a), cos(a)) * lab.yz * uSat;
  lab.x = (lab.x - 0.5) * uContrast + 0.5;
  return vec4(fromOklab(lab), 1.0);
}`,
};

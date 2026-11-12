import { centreHandle, colorUniforms, type LayerDef } from "./types";

export const beams: LayerDef = {
  id: "beams",
  kind: "surface",
  label: "Light beams",
  defaults: { colors: ["#fff6e0", "#ffb866"], cx: 0.5, cy: 1.1, density: 6, length: 0.9, amount: 0.8, flow: 1 },
  controls: [
    { key: "colors", label: "Light colours", type: "color-list", min: 1, max: 3 },
    { key: "cx", label: "Source X", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "cy", label: "Source Y", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "density", label: "Rays", type: "range", min: 1, max: 30, step: 0.5 },
    { key: "length", label: "Reach", type: "range", min: 0.1, max: 3, step: 0.01 },
    { key: "amount", label: "Brightness", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  ...centreHandle("cx", "cy", "Light source"),
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uCenter: [p.cx as number, p.cy as number], uDensity: p.density as number, uLength: p.length as number, uAmount: p.amount as number, uFlow: p.flow as number }),
  fragment: `
uniform vec2 uCenter;
uniform float uDensity, uLength, uAmount, uFlow;
vec4 layer(vec2 uv) {
  vec2 q = (uv - uCenter) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(q);
  // noise read around a circle, so the rays have no seam where the angle wraps
  vec2 dir = q / max(r, 1e-4);
  float t = uTime * uFlow * 0.1;
  float rays = 0.5 + gnoise(dir * uDensity + t) * 0.9 + gnoise(dir * uDensity * 2.7 - t) * 0.4;
  rays = smoothstep(0.35, 0.95, rays);
  float fall = exp(-r / uLength);
  vec3 light = palette(clamp(r / uLength * 0.6, 0.0, 1.0)) * (rays * 0.85 + 0.15) * fall;
  return vec4(texture(uPrev, uv).rgb + light * uAmount, 1.0);
}`,
};

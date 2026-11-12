import type { LayerDef } from "./types";

export const cursorPush: LayerDef = {
  id: "cursor-push",
  kind: "cursor",
  label: "Liquid push",
  interactive: () => true,
  defaults: { strength: 0.08, radius: 0.3, drag: 0.5 },
  controls: [
    { key: "strength", label: "Push", type: "range", min: 0, max: 0.3, step: 0.005 },
    { key: "radius", label: "Reach", type: "range", min: 0.05, max: 0.8, step: 0.01 },
    { key: "drag", label: "Drag", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ uStrength: p.strength as number, uRadius: p.radius as number, uDrag: p.drag as number }),
  fragment: `
uniform float uStrength, uRadius, uDrag;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 d = (uv - uPointer) * asp;
  float fall = exp(-dot(d, d) / (uRadius * uRadius));
  // push outward from the cursor (zero at its centre, so there is no pinch), and smear along its travel
  vec2 off = (d / uRadius * uStrength + uPointerVel * asp * uDrag * 0.12) * fall * uHover;
  return vec4(texture(uPrev, uv - off / asp).rgb, 1.0);
}`,
};

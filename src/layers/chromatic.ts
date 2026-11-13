import type { LayerDef } from "./types";

export const chromatic: LayerDef = {
  id: "chromatic",
  kind: "texture",
  label: "Chromatic split",
  defaults: { amount: 0.015, edges: 0.6 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.06, step: 0.001 },
    { key: "edges", label: "Edges only", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uEdges: p.edges as number }),
  fragment: `
uniform float uAmount, uEdges;
vec4 layer(vec2 uv) {
  vec2 d = uv - 0.5;
  // like a cheap lens: colours separate outward from the centre, more so toward the edges
  vec2 o = d * uAmount * 2.0 * mix(1.0, length(d * vec2(uRes.x / uRes.y, 1.0)) * 2.8, uEdges);
  vec3 acc = vec3(0.0), wsum = vec3(0.0);
  // eight samples along the split, each weighted toward red, green or blue, give a smooth rainbow
  // fringe instead of three hard copies; at amount 0 every sample is the same pixel
  for (int i = 0; i < 8; i++) {
    float t = float(i) / 7.0;
    vec3 w = max(vec3(0.0), 1.0 - abs(t * 2.0 - vec3(0.0, 1.0, 2.0)));
    acc += texture(uPrev, uv + o * (1.0 - 2.0 * t)).rgb * w;
    wsum += w;
  }
  return vec4(acc / wsum, 1.0);
}`,
};

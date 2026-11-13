import { colorUniforms, hash21, type LayerDef, type Params } from "./types";

const MAX = 6;

/** Where blob i sits: the dragged position if there is one, otherwise the seeded one (same maths as the shader). */
function positions(p: Params, seed: number): [number, number][] {
  const colors = p.colors as string[];
  const pts = p.points as number[];
  const spread = p.spread as number;
  return colors.slice(0, MAX).map((_, i) =>
    2 * i + 1 < pts.length ? [pts[2 * i], pts[2 * i + 1]] : [0.5 + (hash21(i, 1.7, seed) - 0.5) * spread, 0.5 + (hash21(i, 9.2, seed) - 0.5) * spread],
  );
}

export const mesh: LayerDef = {
  id: "mesh",
  kind: "base",
  label: "Mesh blur",
  defaults: { colors: ["#0b1d51", "#1e6bff", "#9fd3ff", "#e8f4ff"], sharpness: 2.5, spread: 1, motion: 1, follow: 0, points: [] },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: MAX },
    { key: "sharpness", label: "Sharpness", type: "range", min: 1, max: 6, step: 0.05 },
    { key: "spread", label: "Spread", type: "range", min: 0, max: 1.6, step: 0.01 },
    { key: "motion", label: "Motion", type: "range", min: 0, max: 3, step: 0.05 },
    { key: "follow", label: "Follow cursor", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "points", label: "Colour positions", type: "points", max: MAX },
  ],
  uniforms: (p) => {
    const pts = (p.points as number[]).slice(0, MAX * 2);
    return {
      ...colorUniforms(p.colors as string[]),
      uSharpness: p.sharpness as number,
      uSpread: p.spread as number,
      uMotion: p.motion as number,
      uFollow: p.follow as number,
      uPoints: [...pts, ...new Array(MAX * 2 - pts.length).fill(0.5)],
      uPointCount: Math.floor(pts.length / 2),
    };
  },
  interactive: (p) => (p.follow as number) > 0,
  handles: (p, seed) => positions(p, seed).map(([x, y], i) => ({ x, y, label: `Colour ${i + 1}`, color: (p.colors as string[])[i] })),
  // the first drag pins every blob where it currently is, so nothing else jumps; "Reset positions" goes back to the seed
  moveHandle: (p, seed, index, x, y) => {
    const all = positions(p, seed);
    all[index] = [x, y];
    return { ...p, points: all.flat().map((v) => Math.round(Math.min(1.5, Math.max(-0.5, v)) * 1000) / 1000) };
  },
  fragment: `
uniform float uSharpness, uSpread, uMotion, uFollow;
uniform vec2 uPoints[6];
uniform int uPointCount;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= uColorCount) break;
    float fi = float(i);
    vec2 c = i < uPointCount ? uPoints[i] : 0.5 + (vec2(hash21(vec2(fi, 1.7)), hash21(vec2(fi, 9.2))) - 0.5) * uSpread;
    c += 0.08 * uMotion * vec2(sin(uTime * 0.3 + fi * 2.1), cos(uTime * 0.23 + fi * 1.3));
    // the nearest blobs lean toward the cursor (never all the way, or they would pile up on it); far ones barely move
    vec2 pull = (uPointer - c) * asp;
    c += (uPointer - c) * uFollow * uHover * 0.45 * exp(-dot(pull, pull) * 2.0);
    vec2 d = (uv - c) * asp;
    float w = pow(dot(d, d) + 0.001, -0.5 * uSharpness);
    acc += w * toOklab(uColors[i]);
    wsum += w;
  }
  return vec4(fromOklab(acc / wsum), 1.0);
}`,
};

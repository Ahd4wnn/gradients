/** GLSL helpers shared by a few layers; prepend the ones a fragment needs. */

/** x: distance to the nearest cell point, y: distance to the cell border (F2 - F1), z: cell id 0..1. */
export const VORO = `
vec3 voro(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), c = i + g;
    vec2 o = 0.5 + 0.4 * sin(t + 6.2831853 * vec2(hash21(c), hash21(c + 17.3)));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = hash21(c + 5.1); } else if (d < d2) d2 = d;
  }
  return vec3(d1, d2 - d1, id);
}`;

/** The i-th colour, wrapping round the list: for hard bands that cycle through the palette. */
export const PICK = `
vec3 pick(float i) { return uColors[int(mod(i, float(uColorCount)))]; }
vec3 mixOk(vec3 a, vec3 b, float k) { return fromOklab(mix(toOklab(a), toOklab(b), k)); }`;

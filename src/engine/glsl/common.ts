export const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = `#version 300 es
precision highp float;
precision highp sampler2D; // samplers default to lowp, which would throw away the 16-bit targets on some phones
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform vec3 uColors[6];
uniform int uColorCount;
in vec2 vUv;
out vec4 outColor;

// hash12 by Dave Hoskins (MIT), offset by the recipe seed
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx + uSeed) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 grad2(vec2 i) { float a = 6.2831853 * hash21(i); return vec2(cos(a), sin(a)); }
// gradient noise, roughly -0.7..0.7
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad2(i), f);
  float b = dot(grad2(i + vec2(1, 0)), f - vec2(1, 0));
  float c = dot(grad2(i + vec2(0, 1)), f - vec2(0, 1));
  float d = dot(grad2(i + vec2(1, 1)), f - vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p, int octaves) {
  float amp = 0.5, sum = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    sum += amp * gnoise(p);
    p = p * 2.03 + 17.7;
    amp *= 0.5;
  }
  return sum;
}

vec3 toLinear(vec3 c) { c = max(c, 0.0); return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// OKLab by Bjorn Ottosson (public domain)
vec3 toOklab(vec3 srgb) {
  vec3 c = toLinear(srgb);
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(l, 1.0 / 3.0); m = pow(m, 1.0 / 3.0); s = pow(s, 1.0 / 3.0);
  return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
              1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
              0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 fromOklab(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return toSrgb(vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s));
}
// evenly spaced colour stops, blended in OKLab; t in 0..1
vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  if (uColorCount < 2) return uColors[0];
  float x = t * float(uColorCount - 1);
  int i = int(min(floor(x), float(uColorCount - 2)));
  return fromOklab(mix(toOklab(uColors[i]), toOklab(uColors[i + 1]), smoothstep(0.0, 1.0, x - float(i))));
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
// per-layer compositing; the order matches BLENDS in lib/recipe.ts
uniform float uOpacity;
uniform int uBlend;
vec3 blendMode(vec3 a, vec3 b) {
  if (uBlend == 1) return 1.0 - (1.0 - a) * (1.0 - b);
  if (uBlend == 2) return a * b;
  if (uBlend == 3) return mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), step(0.5, a));
  if (uBlend == 4) return a + b;
  return b;
}
`;

/** Full fragment source for a layer body that defines `vec4 layer(vec2 uv)`. */
export const wrap = (body: string) => `${COMMON}\n${body}
void main() {
  vec4 c = layer(vUv);
  // the common case (opaque, normal) skips the extra read and stays bit-identical to an unblended layer
  if (uOpacity < 1.0 || uBlend != 0) {
    vec3 below = texture(uPrev, vUv).rgb;
    c.rgb = mix(below, blendMode(below, c.rgb), uOpacity);
  }
  outColor = c;
}`;

/** Final pass: triangular noise of ±1/255 hides 8-bit banding. */
export const OUTPUT = `
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  float n = hash21(gl_FragCoord.xy) + hash21(gl_FragCoord.xy + 11.3) - 1.0;
  return vec4(clamp(c + n / 255.0, 0.0, 1.0), 1.0);
}`;

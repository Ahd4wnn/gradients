# Gradient Studio — Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working gradient studio (engine, editor, gallery, PNG export to 4K, embed code, share links) with the eight wave 1 layer types.

**Architecture:** A raw WebGL2 multi-pass renderer draws a recipe (an ordered list of up to six layers) by ping-ponging two float framebuffers; each layer is one fragment shader plus metadata that generates its UI. One custom element, `<gradient-f>`, owns the live canvas lifecycle and is used both by the studio and as the public embed. The recipe is the single source of truth and lives base64url-encoded in the URL.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind, raw WebGL2, Vitest, Playwright, esbuild (embed bundle only).

**Spec:** `docs/superpowers/specs/2026-11-11-gradient-studio-design.md`

**This is plan 1 of 3 for the spec.** Wave 2 (11 layers) and wave 3 (5 layers) each get a plan that adds layer files and presets only; they depend on nothing here changing.

## Global Constraints

- No rendering dependency: raw WebGL2 only, no three.js, no shader library.
- Colours are mixed in OKLab, never raw sRGB.
- Framebuffers are `RGBA16F` when `EXT_color_buffer_float` exists, else `RGBA8`; the final pass always adds ±1/255 noise before 8-bit output.
- Every size-like param is relative to image height, with 1080 px as the reference (`px = param * uRes.y / 1080`).
- A recipe has `v: 1` and 1 to 6 layers. Every param is validated against the layer's controls on decode.
- No database, no accounts, no npm package for the embed.
- Controls are native inputs with labels, fully keyboard-operable. `prefers-reduced-motion` forces speed to 0.
- Code under `src/engine`, `src/layers`, `src/lib`, `src/embed` uses **relative imports only** (no `@/` alias) so esbuild, Vitest and Playwright need no alias config. Code under `src/app` and `src/components` may use `@/`.
- UV origin is bottom-left: `uv.y = 1` is the top of the image.

## Review Focus

1. **Hostile or oversized share link** (`?g=` with 50 layers, `__proto__` layer types, NaN, strings where numbers go, 30 KB of junk) → the studio loads a valid, clamped recipe and never throws. *Test: Task 2, `recipe.test.ts` "hostile values" and "garbage returns default".*
2. **Colour list below its minimum** (one colour, or all colours invalid) → that param falls back to the layer default; the image still renders. *Test: Task 2, "hostile values" (linear with one valid colour).*
3. **Canvas with zero size, garbage `recipe` attribute, or the embed script loaded twice** → no exception reaches the host page; the element renders once it has a size. *Test: Task 3, e2e "embed survives abuse".*
4. **Export bigger than the GPU allows** → rejected with a message that names the largest size that works; no silent downscale. *Test: Task 3, e2e "oversize export is refused".*
5. **Smooth dark gradient** → no visible banding. *Test: Task 3, e2e "no banding".*

## File Structure

```
src/
  engine/glsl/common.ts     shared GLSL (hash, noise, OKLab, palette), vertex shader, output pass
  engine/renderer.ts        createRenderer(canvas) → render / resize / dispose
  layers/types.ts           LayerDef, Control, Params, colorUniforms
  layers/linear.ts … dither.ts   one layer each (8 files)
  layers/index.ts           registry: allLayers, getLayer
  lib/recipe.ts             Recipe type, layer(), cleanRecipe, encode/decode, randomRecipe, cssFallback
  lib/presets.ts            PRESETS
  lib/embed.ts              toHtml, toReact
  lib/exportPng.ts          exportPng
  embed/gradient-f.ts       <gradient-f> custom element; entry of public/embed.js
  types/gradient-f.d.ts     JSX typing for the element
  components/GradientCanvas.tsx  thin wrapper around <gradient-f>
  components/Thumb.tsx      static thumbnail via one shared renderer
  components/LayerStack.tsx
  components/Controls.tsx
  app/page.tsx              gallery
  app/studio/page.tsx       studio
e2e/render.spec.ts, e2e/studio.spec.ts
vitest.config.ts, playwright.config.ts
```

---

### Task 1: Scaffold, shared GLSL and the eight layers

**Files:**
- Create: project scaffold, `vitest.config.ts`, `src/layers/types.ts`, `src/engine/glsl/common.ts`, `src/layers/{linear,radial,mesh,warp,fluted-glass,grain,halftone,dither}.ts`, `src/layers/index.ts`
- Test: `src/layers/layers.test.ts`

**Interfaces:**
- Produces: `LayerDef`, `Control`, `Params`, `ParamValue`, `UniformValue`, `colorUniforms(colors)` from `layers/types`; `allLayers: LayerDef[]`, `getLayer(id: unknown): LayerDef | undefined` from `layers`; `VERT`, `wrap(body)`, `OUTPUT` from `engine/glsl/common`. Every layer fragment defines `vec4 layer(vec2 uv)`.

- [ ] **Step 1: Scaffold the app**

Run in the repo root (the existing `docs/` and `.git` are allowed by the scaffolder):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

```bash
npm i -D vitest @playwright/test esbuild
```

```bash
npx playwright install chromium
```

If the scaffolder's flags have changed, answer its prompts to the same effect: TypeScript, Tailwind, App Router, `src/` directory, `@/*` alias, npm.

- [ ] **Step 2: Add scripts and ignores**

In `package.json` `"scripts"`, add:

```json
"predev": "npm run build:embed",
"prebuild": "npm run build:embed",
"build:embed": "esbuild src/embed/gradient-f.ts --bundle --format=esm --minify --outfile=public/embed.js",
"test": "vitest run",
"e2e": "playwright test"
```

Append to `.gitignore`:

```
public/embed.js
test-results
playwright-report
```

Create `vitest.config.ts` (without it Vitest would also pick up the Playwright specs):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
```

- [ ] **Step 3: Write the failing layer test**

`src/layers/layers.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { allLayers, getLayer } from "./index";

const HEX = /^#[0-9a-f]{6}$/i;

describe.each(allLayers)("layer $id", (def) => {
  test("defaults match controls", () => {
    expect(Object.keys(def.defaults).sort()).toEqual(def.controls.map((c) => c.key).sort());
    for (const c of def.controls) {
      const v = def.defaults[c.key];
      if (c.type === "range") {
        expect(typeof v).toBe("number");
        expect(v).toBeGreaterThanOrEqual(c.min);
        expect(v).toBeLessThanOrEqual(c.max);
      } else if (c.type === "select") expect(c.options).toContain(v);
      else if (c.type === "toggle") expect(typeof v).toBe("boolean");
      else {
        const list = v as string[];
        expect(list.length).toBeGreaterThanOrEqual(c.min);
        expect(list.length).toBeLessThanOrEqual(c.max);
        for (const hex of list) expect(hex).toMatch(HEX);
      }
    }
  });

  test("uniforms are finite numbers", () => {
    for (const u of Object.values(def.uniforms(def.defaults)))
      for (const n of [u].flat()) expect(Number.isFinite(n)).toBe(true);
  });

  test("fragment defines layer()", () => {
    expect(def.fragment).toContain("vec4 layer(vec2 uv)");
  });
});

test("registry has the eight wave 1 layers and ignores prototype keys", () => {
  expect(allLayers.map((l) => l.id)).toEqual(["linear", "radial", "mesh", "warp", "fluted-glass", "grain", "halftone", "dither"]);
  for (const bad of ["constructor", "__proto__", "toString", "nope", 7, null, undefined]) expect(getLayer(bad)).toBeUndefined();
});
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./index`.

- [ ] **Step 5: Write `src/layers/types.ts`**

```ts
export type ParamValue = number | string | boolean | string[];
export type Params = Record<string, ParamValue>;

export type Control =
  | { key: string; label: string; type: "range"; min: number; max: number; step: number }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "color-list"; min: number; max: number };

export type UniformValue = number | number[];

export type LayerDef = {
  id: string;
  kind: "base" | "distort" | "surface" | "texture";
  label: string;
  fragment: string;
  defaults: Params;
  controls: Control[];
  uniforms(p: Params): Record<string, UniformValue>;
};

export const MAX_COLORS = 6;

/** Hex colours → the `uColors[6]` / `uColorCount` uniforms declared in common GLSL. */
export function colorUniforms(colors: string[]): { uColors: number[]; uColorCount: number } {
  const uColors: number[] = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    const n = parseInt((colors[Math.min(i, colors.length - 1)] ?? "#000000").slice(1), 16);
    uColors.push(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  return { uColors, uColorCount: Math.max(1, Math.min(colors.length, MAX_COLORS)) };
}
```

- [ ] **Step 6: Write `src/engine/glsl/common.ts`**

```ts
export const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = `#version 300 es
precision highp float;
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
`;

/** Full fragment source for a layer body that defines `vec4 layer(vec2 uv)`. */
export const wrap = (body: string) => `${COMMON}\n${body}\nvoid main() { outColor = layer(vUv); }`;

/** Final pass: triangular noise of ±1/255 hides 8-bit banding. */
export const OUTPUT = `
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  float n = hash21(gl_FragCoord.xy) + hash21(gl_FragCoord.xy + 11.3) - 1.0;
  return vec4(clamp(c + n / 255.0, 0.0, 1.0), 1.0);
}`;
```

- [ ] **Step 7: Write the three base layers**

`src/layers/linear.ts` (first colour is at the bottom when angle is 0):

```ts
import { colorUniforms, type LayerDef } from "./types";

export const linear: LayerDef = {
  id: "linear",
  kind: "base",
  label: "Horizon fade",
  defaults: { colors: ["#a9d0ff", "#1a4fd6", "#03061c"], angle: 0, bend: 0, spread: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 360, step: 1 },
    { key: "bend", label: "Bend", type: "range", min: -2, max: 2, step: 0.01 },
    { key: "spread", label: "Spread", type: "range", min: 0.2, max: 2, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uAngle: p.angle as number, uBend: p.bend as number, uSpread: p.spread as number }),
  fragment: `
uniform float uAngle, uBend, uSpread;
vec4 layer(vec2 uv) {
  vec2 p = uv - 0.5;
  float a = radians(uAngle);
  vec2 d = vec2(sin(a), cos(a));
  float side = dot(p, vec2(d.y, -d.x));
  float t = dot(p, d) + uBend * side * side;
  return vec4(palette(t / uSpread + 0.5), 1.0);
}`,
};
```

`src/layers/radial.ts` (first colour is at the centre):

```ts
import { colorUniforms, type LayerDef } from "./types";

export const radial: LayerDef = {
  id: "radial",
  kind: "base",
  label: "Aura glow",
  defaults: { colors: ["#ffb347", "#ff7eb3", "#ffe1ee"], cx: 0.5, cy: 0.5, radius: 0.7, stretch: 1, falloff: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "cx", label: "Centre X", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "cy", label: "Centre Y", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "radius", label: "Radius", type: "range", min: 0.05, max: 2, step: 0.01 },
    { key: "stretch", label: "Stretch", type: "range", min: 0.25, max: 4, step: 0.01 },
    { key: "falloff", label: "Falloff", type: "range", min: 0.3, max: 3, step: 0.01 },
  ],
  uniforms: (p) => ({
    ...colorUniforms(p.colors as string[]),
    uCenter: [p.cx as number, p.cy as number],
    uRadius: p.radius as number,
    uStretch: p.stretch as number,
    uFalloff: p.falloff as number,
  }),
  fragment: `
uniform vec2 uCenter;
uniform float uRadius, uStretch, uFalloff;
vec4 layer(vec2 uv) {
  vec2 p = (uv - uCenter) * vec2(uRes.x / uRes.y / uStretch, 1.0);
  return vec4(palette(pow(clamp(length(p) / uRadius, 0.0, 1.0), uFalloff)), 1.0);
}`,
};
```

`src/layers/mesh.ts` (one soft blob per colour, positions from the seed):

```ts
import { colorUniforms, type LayerDef } from "./types";

export const mesh: LayerDef = {
  id: "mesh",
  kind: "base",
  label: "Mesh blur",
  defaults: { colors: ["#0b1d51", "#1e6bff", "#9fd3ff", "#e8f4ff"], sharpness: 2.5, spread: 1, motion: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "sharpness", label: "Sharpness", type: "range", min: 1, max: 6, step: 0.05 },
    { key: "spread", label: "Spread", type: "range", min: 0, max: 1.6, step: 0.01 },
    { key: "motion", label: "Motion", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uSharpness: p.sharpness as number, uSpread: p.spread as number, uMotion: p.motion as number }),
  fragment: `
uniform float uSharpness, uSpread, uMotion;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= uColorCount) break;
    float fi = float(i);
    vec2 c = 0.5 + (vec2(hash21(vec2(fi, 1.7)), hash21(vec2(fi, 9.2))) - 0.5) * uSpread;
    c += 0.08 * uMotion * vec2(sin(uTime * 0.3 + fi * 2.1), cos(uTime * 0.23 + fi * 1.3));
    vec2 d = (uv - c) * asp;
    float w = pow(dot(d, d) + 0.001, -0.5 * uSharpness);
    acc += w * toOklab(uColors[i]);
    wsum += w;
  }
  return vec4(fromOklab(acc / wsum), 1.0);
}`,
};
```

- [ ] **Step 8: Write the distort and surface layers**

`src/layers/warp.ts` (two-step domain warp of whatever is below):

```ts
import type { LayerDef } from "./types";

export const warp: LayerDef = {
  id: "warp",
  kind: "distort",
  label: "Liquid swirl",
  defaults: { amount: 0.15, scale: 1.5, detail: 2, flow: 1 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.6, step: 0.005 },
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 6, step: 0.05 },
    { key: "detail", label: "Detail", type: "range", min: 1, max: 4, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uScale: p.scale as number, uDetail: p.detail as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmount, uScale, uDetail, uFlow;
vec4 layer(vec2 uv) {
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * uScale;
  int o = int(uDetail);
  float t = uTime * uFlow * 0.1;
  vec2 q = vec2(fbm(p + vec2(0.0, t), o), fbm(p + vec2(5.2, 1.3 - t), o));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2), o), fbm(p + 3.0 * q + vec2(8.3, 2.8), o));
  return vec4(texture(uPrev, uv + uAmount * r).rgb, 1.0);
}`,
};
```

`src/layers/fluted-glass.ts` (each ridge is a small lens; `count` is ridges per image height, so it is resolution independent):

```ts
import type { LayerDef } from "./types";

export const flutedGlass: LayerDef = {
  id: "fluted-glass",
  kind: "surface",
  label: "Fluted glass",
  defaults: { count: 24, strength: 3, angle: 0, shade: 0.25 },
  controls: [
    { key: "count", label: "Ridges", type: "range", min: 4, max: 120, step: 1 },
    { key: "strength", label: "Refraction", type: "range", min: 0, max: 10, step: 0.05 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "shade", label: "Shading", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ uCount: p.count as number, uStrength: p.strength as number, uAngle: p.angle as number, uShade: p.shade as number }),
  fragment: `
uniform float uCount, uStrength, uAngle, uShade;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a));
  float f = fract(dot((uv - 0.5) * asp, d) * uCount) - 0.5;
  vec3 c = texture(uPrev, uv + d / asp * (f * uStrength / uCount)).rgb;
  c *= 1.0 - uShade * abs(f);
  c += uShade * 0.15 * smoothstep(0.3, 0.5, f);
  return vec4(c, 1.0);
}`,
};
```

- [ ] **Step 9: Write the three texture layers**

`src/layers/grain.ts` ("edge" mode keeps grain only where colour is changing):

```ts
import type { LayerDef } from "./types";

export const grain: LayerDef = {
  id: "grain",
  kind: "texture",
  label: "Grain",
  defaults: { amount: 0.12, size: 1.5, mode: "film", mono: true },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.5, step: 0.005 },
    { key: "size", label: "Grain size", type: "range", min: 1, max: 6, step: 0.1 },
    { key: "mode", label: "Mode", type: "select", options: ["film", "edge"] },
    { key: "mono", label: "Monochrome", type: "toggle" },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uSize: p.size as number, uEdge: p.mode === "edge" ? 1 : 0, uMono: p.mono ? 1 : 0 }),
  fragment: `
uniform float uAmount, uSize, uEdge, uMono;
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  float cell = max(1.0, uSize * uRes.y / 1080.0);
  vec2 g = floor(gl_FragCoord.xy / cell) + floor(uTime * 12.0) * 7.0;
  vec3 n = vec3(hash21(g), hash21(g + 31.7), hash21(g + 73.1)) - 0.5;
  if (uMono > 0.5) n = vec3(n.x);
  float k = 1.0;
  if (uEdge > 0.5) {
    float l = luma(c);
    k = clamp(length(vec2(dFdx(l), dFdy(l))) * uRes.y * 0.6, 0.0, 1.0);
  }
  return vec4(c + n * uAmount * k, 1.0);
}`,
};
```

`src/layers/halftone.ts` (dots carry the colour below; `colors[0]` is the paper):

```ts
import { colorUniforms, type LayerDef } from "./types";

export const halftone: LayerDef = {
  id: "halftone",
  kind: "texture",
  label: "Halftone dots",
  defaults: { colors: ["#f5efe6"], pitch: 10, angle: 45, soft: 0.05, invert: false },
  controls: [
    { key: "colors", label: "Paper colour", type: "color-list", min: 1, max: 1 },
    { key: "pitch", label: "Dot spacing", type: "range", min: 4, max: 60, step: 0.5 },
    { key: "angle", label: "Screen angle", type: "range", min: 0, max: 90, step: 1 },
    { key: "soft", label: "Softness", type: "range", min: 0, max: 0.3, step: 0.005 },
    { key: "invert", label: "Light dots", type: "toggle" },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uPitch: p.pitch as number, uAngle: p.angle as number, uSoft: p.soft as number, uInvert: p.invert ? 1 : 0 }),
  fragment: `
uniform float uPitch, uAngle, uSoft, uInvert;
vec4 layer(vec2 uv) {
  float a = radians(uAngle);
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  float pitch = max(2.0, uPitch * uRes.y / 1080.0);
  vec2 g = rot * gl_FragCoord.xy / pitch;
  vec2 centre = transpose(rot) * (floor(g) + 0.5) * pitch;
  vec3 src = texture(uPrev, centre / uRes).rgb;
  float m = uInvert > 0.5 ? luma(src) : 1.0 - luma(src);
  float r = sqrt(clamp(m, 0.0, 1.0)) * 0.72;
  float edge = uSoft + 1.0 / pitch;
  float cover = 1.0 - smoothstep(r - edge, r + edge, length(fract(g) - 0.5));
  return vec4(mix(uColors[0], src, cover), 1.0);
}`,
};
```

`src/layers/dither.ts` (pixelate, then quantise each channel with an ordered threshold):

```ts
import type { LayerDef } from "./types";

const PATTERNS = ["bayer4", "bayer8", "noise"];

export const dither: LayerDef = {
  id: "dither",
  kind: "texture",
  label: "Dither",
  defaults: { pixel: 4, levels: 4, pattern: "bayer4" },
  controls: [
    { key: "pixel", label: "Pixel size", type: "range", min: 1, max: 24, step: 1 },
    { key: "levels", label: "Colour levels", type: "range", min: 2, max: 8, step: 1 },
    { key: "pattern", label: "Pattern", type: "select", options: PATTERNS },
  ],
  uniforms: (p) => ({ uPixel: p.pixel as number, uLevels: p.levels as number, uPattern: PATTERNS.indexOf(p.pattern as string) }),
  fragment: `
uniform float uPixel, uLevels, uPattern;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
vec4 layer(vec2 uv) {
  float px = max(1.0, floor(uPixel * uRes.y / 1080.0));
  vec2 cell = floor(gl_FragCoord.xy / px);
  vec3 c = texture(uPrev, (cell + 0.5) * px / uRes).rgb;
  float th = uPattern < 0.5 ? bayer4(cell) : uPattern < 1.5 ? bayer8(cell) : hash21(cell);
  float n = uLevels - 1.0;
  return vec4(floor(clamp(c, 0.0, 1.0) * n + th) / n, 1.0);
}`,
};
```

- [ ] **Step 10: Write the registry `src/layers/index.ts`**

```ts
import { dither } from "./dither";
import { flutedGlass } from "./fluted-glass";
import { grain } from "./grain";
import { halftone } from "./halftone";
import { linear } from "./linear";
import { mesh } from "./mesh";
import { radial } from "./radial";
import type { LayerDef } from "./types";
import { warp } from "./warp";

export const allLayers: LayerDef[] = [linear, radial, mesh, warp, flutedGlass, grain, halftone, dither];

const byId = new Map(allLayers.map((l) => [l.id, l]));

/** Map lookup, so "constructor" and "__proto__" are not layers. */
export const getLayer = (id: unknown): LayerDef | undefined => (typeof id === "string" ? byId.get(id) : undefined);
```

- [ ] **Step 11: Run the tests**

Run: `npm test`
Expected: PASS, 25 tests (3 per layer × 8, plus the registry test).

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "Scaffold app; add shared GLSL and wave 1 layers"
```

---

### Task 2: Recipe, presets and embed snippets

**Files:**
- Create: `src/lib/recipe.ts`, `src/lib/presets.ts`, `src/lib/embed.ts`
- Test: `src/lib/recipe.test.ts`, `src/lib/embed.test.ts`

**Interfaces:**
- Consumes: `getLayer`, `Control`, `Params`, `ParamValue` from Task 1.
- Produces from `lib/recipe`: `type Layer = { type: string; params: Params; hidden?: boolean }`, `type Recipe = { v: 1; seed: number; frame: number; speed: number; layers: Layer[] }`, `MAX_LAYERS = 6`, `DEFAULT_RECIPE`, `layer(type, overrides?) → Layer`, `cleanRecipe(raw: unknown) → Recipe`, `encodeRecipe(r) → string`, `decodeRecipe(s: string | null | undefined) → Recipe`, `randomRecipe(seed: number) → Recipe`, `cssFallback(r) → string`.
- Produces from `lib/presets`: `PRESETS: { name: string; recipe: Recipe }[]`.
- Produces from `lib/embed`: `toHtml(r, origin) → string`, `toReact(r, origin) → string`.

- [ ] **Step 1: Write the failing tests**

`src/lib/recipe.test.ts`:

```ts
import { expect, test } from "vitest";
import { allLayers } from "../layers";
import { PRESETS } from "./presets";
import { cleanRecipe, cssFallback, decodeRecipe, DEFAULT_RECIPE, encodeRecipe, layer, MAX_LAYERS, randomRecipe } from "./recipe";

test.each(PRESETS)("preset round trip: $name", ({ recipe }) => {
  const encoded = encodeRecipe(recipe);
  expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeRecipe(encoded)).toEqual(recipe);
});

test("presets cover every layer", () => {
  expect(PRESETS.length).toBeGreaterThanOrEqual(12);
  const used = new Set(PRESETS.flatMap((p) => p.recipe.layers.map((l) => l.type)));
  for (const def of allLayers) expect(used).toContain(def.id);
});

test("garbage returns default", () => {
  for (const s of [null, undefined, "", "%%%", "e30", btoa("[]"), btoa("null"), btoa('{"layers":[]}'), "A".repeat(30000)])
    expect(decodeRecipe(s)).toEqual(DEFAULT_RECIPE);
});

test("hostile values are clamped or dropped", () => {
  const r = cleanRecipe({
    seed: 1e99,
    frame: -5,
    speed: "fast",
    layers: [
      { type: "__proto__", params: {} },
      { type: "constructor" },
      { type: "nope" },
      null,
      7,
      { type: "linear", hidden: "yes", params: { angle: 99999, bend: NaN, spread: "x", colors: ["red", "#12345", "#ffffff"], extra: 1 } },
      ...Array.from({ length: 50 }, () => ({ type: "grain" })),
    ],
  });
  expect(r.seed).toBe(9999);
  expect(r.frame).toBe(0);
  expect(r.speed).toBe(0);
  expect(r.layers).toHaveLength(MAX_LAYERS);
  // one valid colour is below the minimum of two, so colours fall back to the default
  expect(r.layers[0]).toEqual({ type: "linear", params: { colors: ["#a9d0ff", "#1a4fd6", "#03061c"], angle: 360, bend: 0, spread: 1 } });
  expect(r.layers[1]).toEqual(layer("grain"));
});

test("hidden survives only as true", () => {
  expect(cleanRecipe({ layers: [{ ...layer("mesh"), hidden: true }] }).layers[0].hidden).toBe(true);
  expect("hidden" in cleanRecipe({ layers: [{ ...layer("mesh"), hidden: false }] }).layers[0]).toBe(false);
});

test("randomRecipe is deterministic and valid", () => {
  for (let n = 0; n < 50; n++) {
    const r = randomRecipe(n);
    expect(r).toEqual(randomRecipe(n));
    expect(cleanRecipe(r)).toEqual(r);
  }
});

test("layer() rejects unknown types", () => {
  expect(() => layer("nope")).toThrow('Unknown layer "nope"');
});

test("cssFallback uses the first colour list", () => {
  expect(cssFallback(DEFAULT_RECIPE)).toBe("linear-gradient(to top, #0b1d51, #1e6bff, #9fd3ff, #e8f4ff, #e8f4ff)");
  expect(cssFallback({ ...DEFAULT_RECIPE, layers: [layer("grain")] })).toBe("linear-gradient(to top, #111111, #111111)");
});
```

`src/lib/embed.test.ts`:

```ts
import { expect, test } from "vitest";
import { toHtml, toReact } from "./embed";
import { DEFAULT_RECIPE, encodeRecipe } from "./recipe";

const enc = encodeRecipe(DEFAULT_RECIPE);

test("html snippet loads the runtime and carries the recipe", () => {
  const html = toHtml(DEFAULT_RECIPE, "https://example.test");
  expect(html).toContain('<script type="module" src="https://example.test/embed.js"></script>');
  expect(html).toContain(`<gradient-f recipe="${enc}"`);
});

test("react snippet carries the recipe", () => {
  const jsx = toReact(DEFAULT_RECIPE, "https://example.test");
  expect(jsx).toContain("https://example.test/embed.js");
  expect(jsx).toContain(`recipe="${enc}"`);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `./presets`, `./recipe`, `./embed`.

- [ ] **Step 3: Write `src/lib/recipe.ts`**

```ts
import { getLayer } from "../layers";
import type { Control, Params, ParamValue } from "../layers/types";

export type Layer = { type: string; params: Params; hidden?: boolean };
export type Recipe = { v: 1; seed: number; frame: number; speed: number; layers: Layer[] };

export const MAX_LAYERS = 6;
const HEX = /^#[0-9a-f]{6}$/i;

/** A layer with its defaults, plus any overrides. */
export function layer(type: string, overrides: Params = {}): Layer {
  const def = getLayer(type);
  if (!def) throw new Error(`Unknown layer "${type}"`);
  return { type, params: { ...structuredClone(def.defaults), ...overrides } };
}

export const DEFAULT_RECIPE: Recipe = { v: 1, seed: 7, frame: 0, speed: 0, layers: [layer("mesh"), layer("grain")] };

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

function cleanParam(c: Control, v: unknown, fallback: ParamValue): ParamValue {
  switch (c.type) {
    case "range":
      return num(v, c.min, c.max, fallback as number);
    case "select":
      return typeof v === "string" && c.options.includes(v) ? v : fallback;
    case "toggle":
      return typeof v === "boolean" ? v : fallback;
    case "color-list": {
      const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && HEX.test(x)).slice(0, c.max) : [];
      return list.length >= c.min ? list : structuredClone(fallback);
    }
  }
}

/** Trust boundary: anything in, a renderable recipe out. Never throws. */
export function cleanRecipe(raw: unknown): Recipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const layers: Layer[] = [];
  for (const item of Array.isArray(r.layers) ? r.layers : []) {
    if (layers.length >= MAX_LAYERS) break;
    if (!item || typeof item !== "object") continue;
    const src = item as Record<string, unknown>;
    const def = getLayer(src.type);
    if (!def) continue;
    const given = (src.params && typeof src.params === "object" ? src.params : {}) as Record<string, unknown>;
    const params: Params = {};
    for (const c of def.controls) params[c.key] = cleanParam(c, Object.hasOwn(given, c.key) ? given[c.key] : undefined, def.defaults[c.key]);
    layers.push(src.hidden === true ? { type: def.id, params, hidden: true } : { type: def.id, params });
  }
  if (!layers.length) return structuredClone(DEFAULT_RECIPE);
  return { v: 1, seed: Math.floor(num(r.seed, 0, 9999, 0)), frame: num(r.frame, 0, 3_600_000, 0), speed: num(r.speed, 0, 4, 0), layers };
}

export function encodeRecipe(r: Recipe): string {
  return btoa(JSON.stringify(r)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRecipe(s: string | null | undefined): Recipe {
  if (!s || s.length > 20000) return structuredClone(DEFAULT_RECIPE);
  try {
    return cleanRecipe(JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch {
    return structuredClone(DEFAULT_RECIPE);
  }
}

/** CSS stand-in when WebGL is unavailable. Colours are hex-validated by cleanRecipe, so this is safe to put in a style. */
export function cssFallback(r: Recipe): string {
  const cols = r.layers.map((l) => l.params.colors).find((c): c is string[] => Array.isArray(c) && c.length > 0) ?? ["#111111"];
  return `linear-gradient(to top, ${[...cols, cols[cols.length - 1]].join(", ")})`;
}

// Hand-picked palettes: Randomise only varies colour, placement and which layers are stacked,
// never the tuned numeric defaults, so random results stay presentable.
const PALETTES = [
  ["#03061c", "#1a4fd6", "#a9d0ff"],
  ["#16141f", "#5b4bd6", "#c9a8e8"],
  ["#000000", "#3a0d0d", "#e52e1a", "#ff8a00"],
  ["#0a2a8c", "#2f7bff", "#f4f7ff", "#ff6a1a"],
  ["#fdfbfb", "#ffd9e8", "#cfe9ff", "#fff3c4"],
  ["#2a0a14", "#e8456b", "#ffb3c1"],
  ["#0d2b1f", "#1f6b4a", "#a8e6c1"],
  ["#1b1035", "#7b2ff7", "#f107a3", "#ffd6a5"],
];

export function randomRecipe(seed: number): Recipe {
  let a = seed >>> 0;
  const rnd = () => {
    // mulberry32
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const colors = [...PALETTES[Math.floor(rnd() * PALETTES.length)]];
  const place = () => Math.round((0.2 + rnd() * 0.6) * 100) / 100;
  const base = Math.floor(rnd() * 3);
  const layers = [
    base === 0 ? layer("linear", { colors, angle: Math.floor(rnd() * 361) }) : base === 1 ? layer("radial", { colors, cx: place(), cy: place() }) : layer("mesh", { colors }),
  ];
  if (rnd() < 0.5) layers.push(layer("warp"));
  if (rnd() < 0.3) layers.push(layer("fluted-glass"));
  const t = rnd();
  layers.push(layer(t < 0.7 ? "grain" : t < 0.85 ? "halftone" : "dither"));
  return { v: 1, seed: Math.floor(rnd() * 10000), frame: 0, speed: 0, layers };
}
```

- [ ] **Step 4: Write `src/lib/presets.ts`**

These are first drafts; Task 5 tunes and approves them.

```ts
import { layer, type Layer, type Recipe } from "./recipe";

const make = (name: string, seed: number, layers: Layer[]): { name: string; recipe: Recipe } => ({ name, recipe: { v: 1, seed, frame: 0, speed: 0, layers } });

export const PRESETS = [
  make("Deep Horizon", 1, [layer("linear", { colors: ["#a9d0ff", "#1a4fd6", "#03061c", "#000000"], bend: 0.35 }), layer("grain", { amount: 0.08 })]),
  make("Peach Aura", 2, [layer("radial", { colors: ["#ffb347", "#ff7eb3", "#ffe1ee"], radius: 0.8 }), layer("grain", { amount: 0.18, mode: "edge" })]),
  make("Blue Mesh", 3, [layer("mesh"), layer("warp", { amount: 0.12 }), layer("grain", { amount: 0.1 })]),
  make("Violet Dusk", 4, [layer("mesh", { colors: ["#16141f", "#5b4bd6", "#c9a8e8"], sharpness: 3 }), layer("grain", { amount: 0.22, size: 2 })]),
  make("Ember", 5, [layer("linear", { colors: ["#ff8a00", "#e52e1a", "#3a0d0d", "#000000"] }), layer("warp", { amount: 0.25, scale: 1.1 }), layer("grain", { amount: 0.1 })]),
  make("Pastel Wash", 6, [layer("mesh", { colors: ["#fdfbfb", "#ffd9e8", "#cfe9ff", "#fff3c4"], sharpness: 1.8 }), layer("grain", { amount: 0.05 })]),
  make("Reeded Rose", 7, [layer("mesh", { colors: ["#2a0a14", "#e8456b", "#ffb3c1"] }), layer("fluted-glass", { count: 32, strength: 4 }), layer("grain", { amount: 0.06 })]),
  make("Forest Flute", 8, [layer("linear", { colors: ["#0d2b1f", "#1f6b4a", "#a8e6c1"], angle: 35 }), layer("warp", { amount: 0.2 }), layer("fluted-glass", { count: 18, strength: 5, angle: 20 }), layer("grain", { amount: 0.07 })]),
  make("Thermal Swirl", 9, [layer("mesh", { colors: ["#0a2a8c", "#2f7bff", "#f4f7ff", "#ff6a1a"], sharpness: 3.5 }), layer("warp", { amount: 0.35, scale: 1.2, detail: 3 })]),
  make("Blueprint Dots", 10, [layer("mesh", { colors: ["#0b1d51", "#1e6bff", "#9fd3ff"] }), layer("halftone", { pitch: 9 })]),
  make("Mono Dither", 11, [layer("linear", { colors: ["#000000", "#ffffff"], angle: 20 }), layer("warp", { amount: 0.3 }), layer("dither", { levels: 2, pixel: 5, pattern: "bayer8" })]),
  make("Sunset Dither", 12, [layer("radial", { colors: ["#ffd6a5", "#f107a3", "#7b2ff7", "#1b1035"], cy: 0.2, radius: 1.1 }), layer("dither", { levels: 4, pixel: 6 })]),
];
```

- [ ] **Step 5: Write `src/lib/embed.ts`**

```ts
import { encodeRecipe, type Recipe } from "./recipe";

export function toHtml(r: Recipe, origin: string): string {
  return `<script type="module" src="${origin}/embed.js"></script>
<gradient-f recipe="${encodeRecipe(r)}" style="display:block;width:100%;height:100vh"></gradient-f>`;
}

export function toReact(r: Recipe, origin: string): string {
  return `// Load the runtime once, e.g. in your root layout:
//   <script type="module" src="${origin}/embed.js" />
export function Gradient() {
  return <gradient-f recipe="${encodeRecipe(r)}" style={{ display: "block", width: "100%", height: "100vh" }} />;
}`;
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS (Task 1's 25 plus 12 preset round trips, 7 recipe tests and 2 embed tests).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add recipe validation, presets and embed snippets"
```

---

### Task 3: Renderer, PNG export and the `<gradient-f>` element

This task is also the spec's 4K spike: its e2e suite proves a three-layer 3840×2160 export.

**Files:**
- Create: `src/engine/renderer.ts`, `src/lib/exportPng.ts`, `src/embed/gradient-f.ts`, `playwright.config.ts`
- Test: `e2e/render.spec.ts`

**Interfaces:**
- Consumes: `VERT`, `wrap`, `OUTPUT` (Task 1); `getLayer` (Task 1); `Recipe`, `decodeRecipe`, `cssFallback` (Task 2).
- Produces: `createRenderer(canvas: HTMLCanvasElement, preserve?: boolean) → Renderer | null` where `Renderer = { render(recipe: Recipe, timeMs: number): void; resize(w: number, h: number): boolean; dispose(): void; maxSize: number }`; `exportPng(recipe, width, height) → Promise<Blob>`; the `gradient-f` custom element (attribute `recipe`); `window.GradientF = { exportPng }`.

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    // software WebGL so the suite also runs on machines with no GPU
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: { command: "npm run build:embed && npx next dev -p 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 180_000 },
});
```

- [ ] **Step 2: Write the failing e2e test**

`e2e/render.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import { allLayers } from "../src/layers";
import { PRESETS } from "../src/lib/presets";
import { layer, type Recipe } from "../src/lib/recipe";

declare global {
  interface Window {
    GradientF: { exportPng(r: Recipe, w: number, h: number): Promise<Blob> };
  }
}

const recipeOf = (...layers: Recipe["layers"]): Recipe => ({ v: 1, seed: 1, frame: 0, speed: 0, layers });

async function open(page: Page) {
  const errors: string[] = [];
  // only the engine's own errors: the dev server and deliberate context loss add unrelated console noise
  page.on("console", (m) => m.type() === "error" && m.text().includes("[gradient-f]") && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await page.addScriptTag({ url: "/embed.js", type: "module" });
  await page.waitForFunction(() => !!window.GradientF);
  return errors;
}

/** Export in the page and measure the PNG there. */
const probe = (page: Page, recipe: Recipe, w: number, h: number) =>
  page.evaluate(
    async ({ recipe, w, h }) => {
      const bmp = await createImageBitmap(await window.GradientF.exportPng(recipe, w, h));
      const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      let hash = 0;
      const seen = new Set<number>();
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        hash = (Math.imul(hash, 31) + v) | 0;
        if (seen.size < 64) seen.add(v);
      }
      // longest run of consecutive byte-identical rows: long runs are visible bands
      const row = bmp.width * 4;
      let run = 1;
      let maxRun = 1;
      for (let y = 1; y < bmp.height; y++) {
        let same = true;
        for (let x = 0; x < row; x++)
          if (d[y * row + x] !== d[(y - 1) * row + x]) {
            same = false;
            break;
          }
        run = same ? run + 1 : 1;
        if (run > maxRun) maxRun = run;
      }
      return { w: bmp.width, h: bmp.height, distinct: seen.size, hash, maxRun };
    },
    { recipe, w, h },
  );

test("every layer compiles and draws", async ({ page }) => {
  const errors = await open(page);
  for (const def of allLayers) {
    const out = await probe(page, recipeOf(layer("mesh"), layer(def.id)), 128, 128);
    expect(out.distinct, def.id).toBeGreaterThan(1);
  }
  expect(errors).toEqual([]);
});

test("presets render, and render the same twice", async ({ page }) => {
  await open(page);
  for (const { name, recipe } of PRESETS) {
    const a = await probe(page, recipe, 256, 144);
    const b = await probe(page, recipe, 256, 144);
    expect(a.distinct, name).toBeGreaterThan(1);
    expect(a.hash, name).toBe(b.hash);
  }
});

test("three-layer 4K export has the requested size", async ({ page }) => {
  await open(page);
  const out = await probe(page, recipeOf(layer("mesh"), layer("warp"), layer("grain")), 3840, 2160);
  expect([out.w, out.h]).toEqual([3840, 2160]);
  expect(out.distinct).toBeGreaterThan(1);
});

test("no banding in a smooth dark gradient", async ({ page }) => {
  await open(page);
  // 16 brightness levels over 1024 rows: without the output noise this bands every ~64 rows
  const out = await probe(page, recipeOf(layer("linear", { colors: ["#000000", "#10101c"] })), 512, 1024);
  expect(out.maxRun).toBeLessThan(8);
});

test("oversize export is refused with the largest workable size", async ({ page }) => {
  await open(page);
  const message = await page.evaluate(
    (recipe) => window.GradientF.exportPng(recipe, 1_000_000, 16).then(() => "resolved", (e: Error) => e.message),
    recipeOf(layer("mesh")),
  );
  expect(message).toMatch(/up to \d+px/);
});

test("embed survives abuse", async ({ page }) => {
  const errors = await open(page);
  await page.addScriptTag({ url: "/embed.js?again", type: "module" }); // loaded twice
  const size = await page.evaluate(async () => {
    const el = document.createElement("gradient-f");
    el.style.cssText = "display:none;width:300px;height:200px";
    el.setAttribute("recipe", "%%% not a recipe");
    document.body.append(el); // zero size while hidden
    el.remove();
    document.body.append(el); // reconnect
    el.style.display = "block";
    el.removeAttribute("recipe");
    await new Promise((r) => setTimeout(r, 300));
    const canvas = el.shadowRoot!.querySelector("canvas")!;
    return [canvas.width, canvas.height];
  });
  expect(size[0]).toBeGreaterThan(0);
  expect(size[1]).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm run e2e`
Expected: FAIL at server start, `build:embed` cannot resolve `src/embed/gradient-f.ts`.

- [ ] **Step 4: Write `src/engine/renderer.ts`**

```ts
import { getLayer } from "../layers";
import type { UniformValue } from "../layers/types";
import type { Recipe } from "../lib/recipe";
import { OUTPUT, VERT, wrap } from "./glsl/common";

export type Renderer = {
  render(recipe: Recipe, timeMs: number): void;
  /** false if the GPU could not allocate targets of this size */
  resize(width: number, height: number): boolean;
  dispose(): void;
  maxSize: number;
};

type Program = { program: WebGLProgram; uniforms: { name: string; type: number; loc: WebGLUniformLocation }[] };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer };

export function createRenderer(canvas: HTMLCanvasElement, preserve = false): Renderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: preserve });
  if (!gl) return null;
  const float = !!gl.getExtension("EXT_color_buffer_float");
  const programs = new Map<string, Program | null>();
  let targets: Target[] = [];
  let w = 0;
  let h = 0;

  function compile(body: string): Program {
    const shader = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };
    const vs = shader(gl!.VERTEX_SHADER, VERT);
    const fs = shader(gl!.FRAGMENT_SHADER, wrap(body));
    const program = gl!.createProgram()!;
    gl!.attachShader(program, vs);
    gl!.attachShader(program, fs);
    gl!.linkProgram(program);
    if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
      const log = gl!.getShaderInfoLog(fs) || gl!.getProgramInfoLog(program) || "link failed";
      gl!.deleteProgram(program);
      throw new Error(log);
    }
    const uniforms: Program["uniforms"] = [];
    for (let i = 0; i < gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS); i++) {
      const info = gl!.getActiveUniform(program, i)!;
      uniforms.push({ name: info.name.replace(/\[0\]$/, ""), type: info.type, loc: gl!.getUniformLocation(program, info.name)! });
    }
    return { program, uniforms };
  }

  // A layer whose shader fails is skipped; the rest of the stack still renders.
  function programFor(id: string, body: string): Program | null {
    if (!programs.has(id)) {
      try {
        programs.set(id, compile(body));
      } catch (e) {
        console.error(`[gradient-f] layer "${id}" failed to compile`, e);
        programs.set(id, null);
      }
    }
    return programs.get(id)!;
  }

  function draw(p: Program, src: WebGLTexture, dst: WebGLFramebuffer | null, values: Record<string, UniformValue>) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, dst);
    gl!.useProgram(p.program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, src);
    for (const u of p.uniforms) {
      const v = values[u.name];
      if (v === undefined) continue;
      if (u.type === gl!.FLOAT) gl!.uniform1f(u.loc, v as number);
      else if (u.type === gl!.INT || u.type === gl!.SAMPLER_2D) gl!.uniform1i(u.loc, v as number);
      else if (u.type === gl!.FLOAT_VEC2) gl!.uniform2fv(u.loc, v as number[]);
      else if (u.type === gl!.FLOAT_VEC3) gl!.uniform3fv(u.loc, v as number[]);
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function freeTargets() {
    for (const t of targets) {
      gl!.deleteTexture(t.tex);
      gl!.deleteFramebuffer(t.fbo);
    }
    targets = [];
  }

  return {
    maxSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,

    resize(width, height) {
      w = Math.max(1, Math.floor(width));
      h = Math.max(1, Math.floor(height));
      canvas.width = w;
      canvas.height = h;
      freeTargets();
      for (let i = 0; i < 2; i++) {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        const fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        targets.push({ tex, fbo });
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          freeTargets();
          return false;
        }
      }
      return true;
    },

    render(recipe, timeMs) {
      const out = programFor("__output", OUTPUT);
      if (targets.length < 2 || !out) return;
      const shared = { uPrev: 0, uRes: [w, h], uTime: (recipe.frame + timeMs * recipe.speed) / 1000, uSeed: recipe.seed };
      gl.viewport(0, 0, w, h);
      // a non-base layer placed first reads black
      let src = targets[1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, src.fbo);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      let pass = 0;
      for (const l of recipe.layers) {
        const def = l.hidden ? undefined : getLayer(l.type);
        const p = def && programFor(def.id, def.fragment);
        if (!def || !p) continue;
        const dst = targets[pass++ % 2];
        draw(p, src.tex, dst.fbo, { ...def.uniforms({ ...def.defaults, ...l.params }), ...shared });
        src = dst;
      }
      draw(out, src.tex, null, shared);
    },

    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
```

- [ ] **Step 5: Write `src/lib/exportPng.ts`**

```ts
import { createRenderer } from "../engine/renderer";
import type { Recipe } from "./recipe";

/** Render one still at an exact pixel size. Rejects with a user-facing message; never downsizes silently. */
export async function exportPng(recipe: Recipe, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const renderer = createRenderer(canvas, true);
  if (!renderer) throw new Error("Export needs WebGL2, which is unavailable in this browser.");
  try {
    if (Math.max(width, height) > renderer.maxSize) throw new Error(`This device can export up to ${renderer.maxSize}px on the longest side.`);
    if (!renderer.resize(width, height)) throw new Error("Not enough graphics memory for this size. Try the next size down.");
    renderer.render(recipe, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The browser could not encode the image. Try the next size down.");
    return blob;
  } finally {
    renderer.dispose();
  }
}
```

- [ ] **Step 6: Write `src/embed/gradient-f.ts`**

```ts
import { createRenderer, type Renderer } from "../engine/renderer";
import { exportPng } from "../lib/exportPng";
import { cssFallback, decodeRecipe, type Recipe } from "../lib/recipe";

const STYLE =
  "<style>:host{display:block;position:relative;overflow:hidden}canvas{display:block;width:100%;height:100%}" +
  "p{position:absolute;inset:auto 0 0 0;margin:0;padding:.75rem;font:14px system-ui,sans-serif;color:#fff;background:#0009}</style>";

function define() {
  // also guards against the script being included twice, and against running on the server
  if (typeof window === "undefined" || customElements.get("gradient-f")) return;

  class GradientF extends HTMLElement {
    static observedAttributes = ["recipe"];
    #root = this.attachShadow({ mode: "open" });
    #canvas: HTMLCanvasElement | null = null;
    #renderer: Renderer | null = null;
    #recipe: Recipe = decodeRecipe(null);
    #raf = 0;
    #start = 0;
    #visible = true;
    #sizes = new ResizeObserver(() => this.#resize());
    #views = new IntersectionObserver((entries) => {
      this.#visible = entries[entries.length - 1].isIntersecting;
      this.#schedule();
    });

    connectedCallback() {
      // a fresh canvas per connection: dispose() loses the old canvas's context for good
      this.#root.innerHTML = STYLE;
      const canvas = (this.#canvas = document.createElement("canvas"));
      canvas.addEventListener("webglcontextlost", (e) => {
        if (canvas !== this.#canvas) return;
        e.preventDefault();
        this.#renderer = null;
        cancelAnimationFrame(this.#raf);
        this.#fallback();
      });
      canvas.addEventListener("webglcontextrestored", () => {
        if (canvas === this.#canvas) this.#init();
      });
      this.#root.append(canvas);
      this.#init();
      this.#sizes.observe(this);
      this.#views.observe(this);
    }

    disconnectedCallback() {
      this.#sizes.disconnect();
      this.#views.disconnect();
      cancelAnimationFrame(this.#raf);
      const renderer = this.#renderer;
      this.#renderer = null;
      this.#canvas = null;
      renderer?.dispose();
    }

    attributeChangedCallback(_name: string, _old: string | null, value: string | null) {
      this.#recipe = decodeRecipe(value);
      if (this.#canvas && !this.#renderer) this.#fallback();
      this.#schedule();
    }

    #init() {
      if (!this.#canvas) return;
      this.#renderer = createRenderer(this.#canvas);
      if (!this.#renderer) return this.#fallback();
      this.style.background = "";
      this.#canvas.style.visibility = "";
      this.#root.querySelector("p")?.remove();
      this.#resize();
    }

    #fallback() {
      if (!this.#canvas) return;
      this.style.background = cssFallback(this.#recipe);
      this.#canvas.style.visibility = "hidden";
      if (this.#root.querySelector("p")) return;
      const note = document.createElement("p");
      note.textContent = "Live preview is unavailable: WebGL2 is switched off or was interrupted.";
      this.#root.append(note);
    }

    #resize() {
      if (!this.#renderer) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(this.clientWidth * dpr);
      const h = Math.round(this.clientHeight * dpr);
      if (!w || !h) return; // hidden or collapsed: draw once it has a size
      this.#renderer.resize(w, h);
      this.#schedule();
    }

    #schedule() {
      cancelAnimationFrame(this.#raf);
      if (!this.#renderer || !this.#visible) return;
      this.#raf = requestAnimationFrame((now) => {
        const renderer = this.#renderer;
        if (!renderer) return;
        this.#start ||= now;
        const animate = this.#recipe.speed !== 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches;
        renderer.render(this.#recipe, animate ? now - this.#start : 0);
        if (animate) this.#schedule();
      });
    }
  }

  customElements.define("gradient-f", GradientF);
  // programmatic export for host pages; the e2e suite uses it too
  (window as unknown as { GradientF: unknown }).GradientF = { exportPng };
}

define();
```

- [ ] **Step 7: Run the e2e suite**

Run: `npm run e2e`
Expected: PASS, 6 tests. The gallery page at `/` is still the scaffold's default page here; the tests only need any page from the app.

If the 4K test fails with a context-lost or out-of-memory error under software WebGL, re-run that one test on the real GPU by temporarily removing `launchOptions` from `playwright.config.ts`. If it passes there, keep `launchOptions` and mark the test `test.skip(!!process.env.CI, "needs a real GPU")`; if it fails on the real GPU too, stop and report, because the spec's export design then needs tiled rendering.

- [ ] **Step 8: Run the unit tests again**

Run: `npm test`
Expected: PASS (unchanged count).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Add WebGL2 renderer, PNG export and gradient-f element"
```

---

### Task 4: Studio and gallery

**Files:**
- Create: `src/types/gradient-f.d.ts`, `src/components/GradientCanvas.tsx`, `src/components/Thumb.tsx`, `src/components/LayerStack.tsx`, `src/components/Controls.tsx`, `src/app/studio/page.tsx`
- Modify: `src/app/page.tsx` (replace scaffold content), `src/app/layout.tsx` (metadata title only)
- Test: `e2e/studio.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 3.
- Produces: routes `/` and `/studio?g=<encoded>`.

- [ ] **Step 1: Write the failing e2e test**

`e2e/studio.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { PRESETS } from "../src/lib/presets";
import { decodeRecipe, encodeRecipe } from "../src/lib/recipe";

const recipeInUrl = (url: string) => decodeRecipe(new URL(url).searchParams.get("g"));

test("gallery links every preset into the studio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Open .* in the studio/ })).toHaveCount(PRESETS.length);
  await page.getByRole("link", { name: "Open Peach Aura in the studio" }).click();
  await expect(page).toHaveURL(/\/studio\?g=/);
  expect(recipeInUrl(page.url())).toEqual(PRESETS[1].recipe);
});

test("editing a control updates the share link", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`); // Blue Mesh: mesh, warp, grain
  await expect(page.locator("gradient-f")).toBeVisible();
  await page.getByLabel("Sharpness").fill("5");
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.sharpness).toBe(5);
});

test("layers can be added, hidden, moved and deleted with the keyboard-operable buttons", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[0].recipe)}`); // Deep Horizon: linear, grain
  await page.getByLabel("Add layer").selectOption("fluted-glass");
  await expect.poll(() => recipeInUrl(page.url()).layers.map((l) => l.type)).toEqual(["linear", "grain", "fluted-glass"]);
  await page.getByRole("button", { name: "Move Fluted glass up" }).click();
  await page.getByLabel("Show Grain").uncheck();
  await expect.poll(() => recipeInUrl(page.url()).layers.map((l) => [l.type, !!l.hidden])).toEqual([["linear", false], ["fluted-glass", false], ["grain", true]]);
  await page.getByRole("button", { name: "Delete Grain" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers).toHaveLength(2);
});

test("export downloads a PNG and reports it", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel("Export size").selectOption("1280x720");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export PNG" }).click()]);
  expect(download.suggestedFilename()).toBe("gradient-1280x720.png");
  await expect(page.getByRole("status")).toHaveText("Saved 1280×720 PNG");
});

test("a broken share link still opens the studio", async ({ page }) => {
  await page.goto("/studio?g=%25%25not-a-recipe");
  await expect(page.locator("gradient-f")).toBeVisible();
  await expect(page.getByLabel("Add layer")).toBeEnabled();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run e2e -- e2e/studio.spec.ts`
Expected: FAIL, no preset links on `/` and `/studio` is a 404.

- [ ] **Step 3: Type the custom element for JSX**

`src/types/gradient-f.d.ts`:

```ts
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gradient-f": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { recipe?: string };
    }
  }
}
```

- [ ] **Step 4: Write the two canvas components**

`src/components/GradientCanvas.tsx`:

```tsx
"use client";
import "@/embed/gradient-f";
import { encodeRecipe, type Recipe } from "@/lib/recipe";

/** Live canvas. All lifecycle (resize, animation, context loss, fallback) lives in the custom element. */
export function GradientCanvas({ recipe, className }: { recipe: Recipe; className?: string }) {
  return <gradient-f recipe={encodeRecipe(recipe)} className={className} />;
}
```

`src/components/Thumb.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { createRenderer, type Renderer } from "@/engine/renderer";
import { cssFallback, type Recipe } from "@/lib/recipe";

// One WebGL context draws every thumbnail: browsers cap live contexts at about 16 per page.
let shared: { canvas: HTMLCanvasElement; renderer: Renderer } | null | undefined;

export function Thumb({ recipe, width = 480, height = 270 }: { recipe: Recipe; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (shared === undefined) {
      const canvas = document.createElement("canvas");
      const renderer = createRenderer(canvas, true);
      shared = renderer ? { canvas, renderer } : null;
    }
    const ctx = ref.current?.getContext("2d");
    if (!shared || !ctx || !shared.renderer.resize(width, height)) return; // CSS background stays as the fallback
    shared.renderer.render(recipe, 0);
    ctx.drawImage(shared.canvas, 0, 0);
  }, [recipe, width, height]);
  return <canvas ref={ref} width={width} height={height} className="block h-full w-full" style={{ background: cssFallback(recipe) }} />;
}
```

- [ ] **Step 5: Write `src/components/LayerStack.tsx`**

```tsx
"use client";
import { allLayers, getLayer } from "@/layers";
import { layer as makeLayer, MAX_LAYERS, type Layer } from "@/lib/recipe";

const KINDS = [
  ["base", "Colour fields"],
  ["distort", "Distortion"],
  ["surface", "Glass and material"],
  ["texture", "Texture"],
] as const;

const btn = "rounded px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-30";

export function LayerStack({ layers, selected, onSelect, onChange }: { layers: Layer[]; selected: number; onSelect: (i: number) => void; onChange: (next: Layer[]) => void }) {
  const full = layers.length >= MAX_LAYERS;
  const move = (i: number, by: -1 | 1) => {
    const next = [...layers];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
    onSelect(i + by);
  };
  return (
    <section aria-label="Layers" className="space-y-2">
      <h2 className="text-xs uppercase tracking-widest text-white/50">Layers, drawn top to bottom</h2>
      <ol className="space-y-1">
        {layers.map((l, i) => {
          const label = getLayer(l.type)!.label;
          return (
            <li key={i} className={`flex items-center gap-1 rounded-md border px-1 ${i === selected ? "border-white/60 bg-white/10" : "border-white/10"}`}>
              <button type="button" aria-pressed={i === selected} onClick={() => onSelect(i)} className={`flex-1 py-2 pl-2 text-left text-sm ${l.hidden ? "text-white/40 line-through" : ""}`}>
                {label}
              </button>
              <label className="flex items-center px-1">
                <input type="checkbox" checked={!l.hidden} onChange={() => onChange(layers.map((x, k) => (k !== i ? x : x.hidden ? { type: x.type, params: x.params } : { ...x, hidden: true })))} />
                <span className="sr-only">Show {label}</span>
              </label>
              <button type="button" className={btn} aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className={btn} aria-label={`Move ${label} down`} disabled={i === layers.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button
                type="button"
                className={btn}
                aria-label={`Delete ${label}`}
                disabled={layers.length === 1}
                onClick={() => {
                  onChange(layers.filter((_, k) => k !== i));
                  onSelect(Math.max(0, Math.min(selected > i ? selected - 1 : selected, layers.length - 2)));
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ol>
      <select
        aria-label="Add layer"
        value=""
        disabled={full}
        className="w-full rounded-md border border-white/20 bg-neutral-900 p-2 text-sm"
        onChange={(e) => {
          if (!e.target.value) return;
          onChange([...layers, makeLayer(e.target.value)]);
          onSelect(layers.length);
        }}
      >
        <option value="">{full ? `Layer limit reached (${MAX_LAYERS})` : "Add layer…"}</option>
        {KINDS.map(([kind, title]) => (
          <optgroup key={kind} label={title}>
            {allLayers.filter((d) => d.kind === kind).map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </section>
  );
}
```

- [ ] **Step 6: Write `src/components/Controls.tsx`**

```tsx
"use client";
import type { LayerDef, Params, ParamValue } from "@/layers/types";

const row = "flex items-center justify-between gap-3 text-sm";

export function Controls({ def, params, onChange }: { def: LayerDef; params: Params; onChange: (key: string, value: ParamValue) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs uppercase tracking-widest text-white/50">{def.label}</legend>
      {def.controls.map((c) => {
        const id = `${def.id}-${c.key}`;
        const v = params[c.key];
        if (c.type === "range")
          return (
            <div key={c.key}>
              <label htmlFor={id} className={row}>
                {c.label}
                <output className="tabular-nums text-white/60">{v as number}</output>
              </label>
              <input id={id} type="range" className="w-full" min={c.min} max={c.max} step={c.step} value={v as number} onChange={(e) => onChange(c.key, Number(e.target.value))} />
            </div>
          );
        if (c.type === "select")
          return (
            <label key={c.key} className={row}>
              {c.label}
              <select className="rounded border border-white/20 bg-neutral-900 p-1" value={v as string} onChange={(e) => onChange(c.key, e.target.value)}>
                {c.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          );
        if (c.type === "toggle")
          return (
            <label key={c.key} className={row}>
              {c.label}
              <input type="checkbox" checked={v as boolean} onChange={(e) => onChange(c.key, e.target.checked)} />
            </label>
          );
        const cols = v as string[];
        return (
          <div key={c.key} role="group" aria-label={c.label} className="space-y-1 text-sm">
            <span>{c.label}</span>
            <div className="flex flex-wrap items-center gap-2">
              {cols.map((col, i) => (
                <span key={i} className="flex items-center">
                  <input type="color" aria-label={`${c.label} ${i + 1}`} value={col} onChange={(e) => onChange(c.key, cols.map((x, k) => (k === i ? e.target.value : x)))} />
                  {cols.length > c.min && (
                    <button type="button" className="px-1 hover:bg-white/10" aria-label={`Remove ${c.label} ${i + 1}`} onClick={() => onChange(c.key, cols.filter((_, k) => k !== i))}>−</button>
                  )}
                </span>
              ))}
              {cols.length < c.max && (
                <button type="button" className="rounded border border-white/20 px-2 py-1 hover:bg-white/10" onClick={() => onChange(c.key, [...cols, cols[cols.length - 1]])}>Add colour</button>
              )}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
```

- [ ] **Step 7: Write `src/app/studio/page.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controls } from "@/components/Controls";
import { GradientCanvas } from "@/components/GradientCanvas";
import { LayerStack } from "@/components/LayerStack";
import { getLayer } from "@/layers";
import { toHtml, toReact } from "@/lib/embed";
import { exportPng } from "@/lib/exportPng";
import { decodeRecipe, DEFAULT_RECIPE, encodeRecipe, randomRecipe, type Recipe } from "@/lib/recipe";

const SIZES = ["1280x720", "1920x1080", "2560x1440", "3840x2160", "1080x1080", "2160x2160", "1080x1920", "2160x3840"];
const btn = "rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40";

export default function Studio() {
  const [recipe, setRecipe] = useState<Recipe>(DEFAULT_RECIPE);
  const [selected, setSelected] = useState(0);
  const [size, setSize] = useState(SIZES[1]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // The recipe arrives in the URL; read it after mount so server and client markup match.
  useEffect(() => {
    const g = new URLSearchParams(location.search).get("g");
    if (g) setRecipe(decodeRecipe(g));
  }, []);

  // Keep the address bar equal to the share link.
  useEffect(() => {
    const t = setTimeout(() => history.replaceState(null, "", `?g=${encodeRecipe(recipe)}`), 300);
    return () => clearTimeout(t);
  }, [recipe]);

  const index = Math.min(selected, recipe.layers.length - 1);
  const current = recipe.layers[index];
  const def = getLayer(current.type)!;

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => setStatus(`${what} copied`),
      () => setStatus(`Could not copy: the browser blocked clipboard access.`),
    );

  async function download() {
    const [w, h] = size.split("x").map(Number);
    setBusy(true);
    setStatus("Rendering…");
    try {
      const url = URL.createObjectURL(await exportPng(recipe, w, h));
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradient-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus(`Saved ${w}×${h} PNG`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-neutral-950 text-white lg:grid-cols-[1fr_22rem]">
      <div className="flex items-center justify-center p-4 lg:p-8">
        <GradientCanvas recipe={recipe} className="aspect-video w-full max-w-5xl rounded-xl shadow-2xl" />
      </div>
      <aside className="space-y-6 border-t border-white/10 p-4 lg:max-h-screen lg:overflow-y-auto lg:border-l lg:border-t-0">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Studio</h1>
          <Link href="/" className="text-sm underline underline-offset-4">Gallery</Link>
        </header>

        <LayerStack layers={recipe.layers} selected={index} onSelect={setSelected} onChange={(layers) => setRecipe({ ...recipe, layers })} />

        <Controls
          def={def}
          params={current.params}
          onChange={(key, value) => setRecipe({ ...recipe, layers: recipe.layers.map((l, i) => (i === index ? { ...l, params: { ...l.params, [key]: value } } : l)) })}
        />

        <section aria-label="Motion" className="space-y-2">
          <label htmlFor="speed" className="flex justify-between text-sm">
            Animation speed <output className="tabular-nums text-white/60">{recipe.speed}</output>
          </label>
          <input id="speed" type="range" className="w-full" min={0} max={4} step={0.05} value={recipe.speed} onChange={(e) => setRecipe({ ...recipe, speed: Number(e.target.value) })} />
        </section>

        <section aria-label="Actions" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => { setRecipe(randomRecipe(Math.floor(Math.random() * 1e9))); setSelected(0); }}>Randomise</button>
            <button type="button" className={btn} onClick={() => copy(`${location.origin}/studio?g=${encodeRecipe(recipe)}`, "Link")}>Copy link</button>
            <button type="button" className={btn} onClick={() => copy(toHtml(recipe, location.origin), "HTML")}>Copy HTML</button>
            <button type="button" className={btn} onClick={() => copy(toReact(recipe, location.origin), "React code")}>Copy React</button>
          </div>
          <div className="flex gap-2">
            <select aria-label="Export size" className="flex-1 rounded-md border border-white/20 bg-neutral-900 p-2 text-sm" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s.replace("x", " × ")}</option>)}
            </select>
            <button type="button" className={btn} disabled={busy} onClick={download}>Export PNG</button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-white/70">{status}</p>
        </section>
      </aside>
    </main>
  );
}
```

- [ ] **Step 8: Replace `src/app/page.tsx` with the gallery**

```tsx
import Link from "next/link";
import { Thumb } from "@/components/Thumb";
import { PRESETS } from "@/lib/presets";
import { encodeRecipe } from "@/lib/recipe";

export default function Gallery() {
  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gradients</h1>
          <p className="mt-1 text-white/60">Pick one to open it in the studio, then make it yours.</p>
        </div>
        <Link href="/studio" className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Start from scratch</Link>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map(({ name, recipe }) => (
          <li key={name}>
            <Link href={`/studio?g=${encodeRecipe(recipe)}`} aria-label={`Open ${name} in the studio`} className="group block overflow-hidden rounded-xl border border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <div className="aspect-video"><Thumb recipe={recipe} /></div>
              <p className="px-3 py-2 text-sm text-white/80 group-hover:text-white">{name}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

In `src/app/layout.tsx`, change only the `metadata` export:

```ts
export const metadata: Metadata = { title: "Gradient Studio", description: "Make gradients worth paying for: mesh, grain, glass, halftone and dither, exported up to 4K." };
```

- [ ] **Step 9: Run the full suites**

Run: `npm run e2e`
Expected: PASS, 11 tests (6 render, 5 studio).

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build succeeds with no type errors. If lint rejects the `setRecipe` call inside the mount effect in `studio/page.tsx`, keep the code and add `// eslint-disable-next-line react-hooks/set-state-in-effect -- the recipe is only readable from the URL after mount` above it; reading it during render would break hydration.

- [ ] **Step 10: Look at it**

Run: `npm run dev`, open `http://localhost:3000`, and check by eye: all twelve thumbnails draw; a preset opens in the studio; every control changes the canvas; reorder, hide and delete work with Tab, Space and Enter only; a 3840×2160 export opens at that size in an image viewer and matches the preview's composition.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "Add studio and gallery"
```

---

### Task 5: Preset tuning and sign-off

The spec requires each preset to be tuned against its Pinterest reference and approved by the product owner. This task has no new code paths; it edits values in `src/lib/presets.ts` only.

**Files:**
- Modify: `src/lib/presets.ts`

**Interfaces:**
- Consumes: the running studio from Task 4.
- Produces: an approved `PRESETS` array.

- [ ] **Step 1: Tune each preset in the studio**

For each of the twelve presets: open it from the gallery, adjust until it matches the look of its reference type from the spec's catalogue (types 1, 2, 3, 5, 6, 10, 11, 12, 14), then copy the recipe out of the URL. Paste the decoded values back as `layer(...)` overrides, keeping the `make(name, seed, [...])` shape.

- [ ] **Step 2: Re-run the suites**

Run: `npm test`
Expected: PASS. The round-trip test fails if a tuned value is outside its control's range.

Run: `npm run e2e`
Expected: PASS.

- [ ] **Step 3: Product owner review**

Show the gallery to the product owner. For each preset the answer is keep, change (with the change), or cut. Apply the answers, keeping at least one preset per wave 1 layer so the "presets cover every layer" test still passes, and repeat Step 2.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Tune and approve wave 1 presets"
```

---

## What comes after this plan

- **Wave 2 plan:** blurred shapes, wave ribbons, melt, thermal contour, line screen, frosted glass, tiled glass, gradient bars, rings, layered waves, retro stripes. Each is one file in `src/layers/`, one line in `src/layers/index.ts`, and presets. Frosted glass needs a blur, which is the one case that may need a second pass inside a layer; that plan decides how.
- **Wave 3 plan:** prism streaks, light beams, holographic foil, liquid chrome, satin folds.
- The existing layer tests and the "every layer compiles and draws" e2e test cover new layers automatically, because both iterate `allLayers`. Only the registry test's expected id list needs extending.

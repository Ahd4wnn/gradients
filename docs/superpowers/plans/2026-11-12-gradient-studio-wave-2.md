# Gradient Studio — Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eleven more gradient layer types, with presets, bringing the catalogue to 19 of 25.

**Architecture:** Each type is one file in `src/layers/` exporting a `LayerDef` (a fragment shader plus the control metadata that builds its UI and validates its values), one entry in the registry, and one or more gallery presets. Nothing in the engine, the studio or the embed changes: they find layers through the registry.

**Tech Stack:** TypeScript, GLSL ES 3.00 (WebGL2), Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-gradient-studio-design.md`

**Read first:** `docs/HANDOFF.md` (state of the working tree), `docs/LAYERS.md` (the layer contract and rules), `docs/PRESET-TUNING.md` (how to look at output).

## Which eleven, and why this differs from the spec's wave 2

The spec's wave column is build order only. This plan takes the five wave 3 types forward and leaves five wave 2 types for the last plan, because of two references the owner supplied on 2026-11-12:

- A Pinterest search for 2026 gradient trends: of 28 pins, most were liquid chrome on black, pearly holographic foil, rainbow light-leak streaks, or frosted pastel glass.
- Figma's Shaders page by popularity, which ranks pattern refraction (115k users), chromatic metal (98k), glowing wave (74k), concentric patterns (70k), pixel stretch (45k), moving blobs (39k) and light rays (37k) above the types deferred here.

| In this plan | Spec type # | Deferred to the last plan | Spec type # |
|---|---|---|---|
| Holographic foil | 19 | Thermal contour | 9 |
| Liquid chrome | 20 | Line screen | 13 |
| Satin folds | 21 | Gradient bars | 22 |
| Prism streaks | 17 | Layered waves | 24 |
| Light beams | 18 | Retro stripes and sunbursts | 25 |
| Frosted glass | 15 | | |
| Tiled glass | 16 | | |
| Blurred shapes | 4 | | |
| Rings and arcs | 23 | | |
| Wave ribbons | 7 | | |
| Melt | 8 | | |

If the owner prefers the spec's original order, the five deferred types need their own shaders; none are written.

## How this code was checked

Every layer file below was compiled and rendered on 2026-11-12 in a scratch copy of the source tree (commit `6da9501` plus the uncommitted working tree described in `docs/HANDOFF.md`), using the same engine through software WebGL. All eleven compiled with no shader errors. The sixteen presets below were rendered and looked at; `docs/superpowers/plans/assets/wave-2-reference.jpg` is that contact sheet.

Not checked: the unit and browser test suites with these layers registered (the scratch copy ran the renderer only), animation (stills only), any size other than 960×540, and real graphics hardware.

## Global Constraints

- No new dependencies. No changes to `src/engine/`, `src/embed/`, `src/components/` or `src/app/` in Tasks 1 to 4.
- Layer ids are permanent once committed: they are stored in shared links.
- Colours are mixed in OKLab (`palette()`, `mixOk()`, `toOklab`/`fromOklab`), never with a plain `mix()` of sRGB values.
- Every size-like param is relative to image height (UV units, or `px = param * uRes.y / 1080`).
- UV origin is bottom-left; `uv.y = 1` is the top.
- Round shapes and sample offsets are corrected for aspect ratio.
- A still renders the same pixels every time (browser test "presets render, and render the same twice").
- Every preset value is inside its control's range (unit test "preset round trip").
- Code under `src/layers` and `src/lib` uses relative imports only.

## Review Focus

1. **A control at either end of its range** (blur 0, amount 0, count 1, fade 0 and 1, stretch 0.25 and 4) → no NaN, no black frame, no division by zero. *Test: Task 5, "new layers survive the ends of their ranges".*
2. **A new layer placed first, with nothing below it** → renders (over black), does not throw. *Test: Task 5, same test, each layer also rendered alone.*
3. **One colour in a list that allows one** (`beams`, `frosted-glass`) → renders. *Covered: both defaults are valid one- or two-colour lists and the per-layer unit test checks defaults; Task 5's test renders `beams` with one colour.*
4. **4K export with the heaviest stack** (`frosted-glass` takes 24 samples per pixel, `chrome` evaluates noise 15 times per pixel) → completes. *Test: Task 5, "heavy stack exports at 4K".*
5. **Looks wrong but compiles.** No automated test can catch this. *Each task ends with a "look at it" step that states what the image must show.*

---

### Task 0: Settle the working tree

The tree has uncommitted work from an earlier session and two type errors (see `docs/HANDOFF.md`). The layers below import `centreHandle` and `PICK`, which exist only in that uncommitted work, so it must be made sound and committed first.

**Files:**
- Modify: `src/components/Controls.tsx` (the final `return` inside `def.controls.map`), `src/layers/layers.test.ts` (the control-type branches)

**Interfaces:**
- Consumes: nothing.
- Produces: a clean `npx tsc --noEmit`; `centreHandle(kx, ky, label)` from `src/layers/types.ts` and `PICK` from `src/layers/glsl.ts`, both committed.

- [ ] **Step 1: Confirm the starting point**

Run: `git status --short` and `npx tsc --noEmit`
Expected: uncommitted changes listed; exactly two type errors, in `src/components/Controls.tsx` and `src/layers/layers.test.ts`, both mentioning `"points"`. If the errors are gone or different, someone has moved the tree on: read `git log` and `git status`, and skip to Step 4.

- [ ] **Step 2: Give the `points` control a branch in the controls panel**

In `src/components/Controls.tsx`, directly above the line `// keyed by layer so an open picker closes when another layer is selected`, add:

```tsx
if (c.type === "points") return null; // placed by dragging on the preview, so there is nothing to show in the panel
```

- [ ] **Step 3: Give it a branch in the layer test**

In `src/layers/layers.test.ts`, replace the final `else { … }` block of the control-type chain (the one that reads `const list = v as string[];`) with:

```ts
else if (c.type === "points") {
        const points = v as number[];
        expect(points.length % 2).toBe(0);
        expect(points.length).toBeLessThanOrEqual(c.max * 2);
        for (const n of points) expect(Number.isFinite(n)).toBe(true);
      } else {
        const list = v as string[];
        expect(list.length).toBeGreaterThanOrEqual(c.min);
        expect(list.length).toBeLessThanOrEqual(c.max);
        for (const hex of list) expect(hex).toMatch(HEX);
      }
```

- [ ] **Step 4: Run everything**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm test` — Expected: all pass (48 at the time of writing).
Run: `npm run e2e` — Expected: 13 passed.
Run: `npm run build` — Expected: build succeeds.

- [ ] **Step 5: Commit the tree in pieces**

Use `git add -p` or per-path adds so each commit is one topic: site redesign; grain crossfade; layer opacity and blend; points and handles types; randomise variants; shader helpers; render script and docs. End every commit message with the attribution line your session requires.

---

### Task 1: Light and material: holographic foil, liquid chrome, satin folds, prism streaks, light beams

**Files:**
- Create: `src/layers/holo-foil.ts`, `src/layers/chrome.ts`, `src/layers/satin.ts`, `src/layers/prism.ts`, `src/layers/beams.ts`
- Modify: `src/layers/index.ts`, `src/layers/layers.test.ts` (registry test), `src/lib/presets.ts`

**Interfaces:**
- Consumes: `LayerDef`, `colorUniforms`, `centreHandle` from `src/layers/types.ts`; `PICK` from `src/layers/glsl.ts`; shared GLSL from `src/engine/glsl/common.ts` (see `docs/LAYERS.md`).
- Produces: layer ids `holo-foil`, `chrome`, `satin`, `prism`, `beams`, exported as `holoFoil`, `chrome`, `satin`, `prism`, `beams`.

- [ ] **Step 1: Extend the registry test so it fails**

In `src/layers/layers.test.ts`, in the test "registry has the … layers and ignores prototype keys", set the expected id list to:

```ts
expect(allLayers.map((l) => l.id)).toEqual(["linear","radial","mesh","warp","fluted-glass","grain","halftone","dither","holo-foil","chrome","satin","prism","beams"]);
```

Run: `npm test`
Expected: FAIL in the registry test; the received list has 8 ids, the expected list 13.

- [ ] **Step 2: Create the layer files**

`src/layers/holo-foil.ts`:

```ts
import type { LayerDef } from "./types";

export const holoFoil: LayerDef = {
  id: "holo-foil",
  kind: "surface",
  label: "Holographic foil",
  defaults: { amount: 0.85, scale: 1.2, cycles: 2.5, pastel: 0.45, flow: 1 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 6, step: 0.05 },
    { key: "cycles", label: "Colour cycles", type: "range", min: 0.5, max: 8, step: 0.1 },
    { key: "pastel", label: "Pastel", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uScale: p.scale as number, uCycles: p.cycles as number, uPastel: p.pastel as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmount, uScale, uCycles, uPastel, uFlow;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * uScale;
  float t = uTime * uFlow * 0.05;
  vec2 q = vec2(fbm(p + vec2(1.7, 9.2 + t), 2), fbm(p + vec2(8.3 - t, 2.8), 2));
  // film thickness: a slow warped field, a diagonal sweep, and the picture underneath
  float film = fbm(p + 2.0 * q, 3) * uCycles + dot(uv, vec2(0.6, 0.4)) * uCycles * 0.5 + luma(c) * 0.5;
  vec3 holo = mix(spectrum(film), vec3(1.0), uPastel) * (0.8 + 0.25 * luma(c));
  return vec4(mix(c, holo, uAmount), 1.0);
}`,
};
```

`src/layers/chrome.ts`:

```ts
import type { LayerDef } from "./types";

export const chrome: LayerDef = {
  id: "chrome",
  kind: "surface",
  label: "Liquid chrome",
  defaults: { scale: 0.8, depth: 1, streaks: 2, iris: 0.6, tint: 0.25, flow: 1 },
  controls: [
    { key: "scale", label: "Scale", type: "range", min: 0.3, max: 5, step: 0.05 },
    { key: "depth", label: "Depth", type: "range", min: 0.1, max: 3, step: 0.05 },
    { key: "streaks", label: "Reflections", type: "range", min: 0.5, max: 6, step: 0.1 },
    { key: "iris", label: "Rainbow edge", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "tint", label: "Colour from below", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uScale: p.scale as number, uDepth: p.depth as number, uStreaks: p.streaks as number, uIris: p.iris as number, uTint: p.tint as number, uFlow: p.flow as number }),
  fragment: `
uniform float uScale, uDepth, uStreaks, uIris, uTint, uFlow;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
float height(vec2 p) {
  float t = uTime * uFlow * 0.06;
  vec2 q = vec2(fbm(p + vec2(0.0, t), 2), fbm(p + vec2(5.2, 1.3 - t), 2));
  // one octave only: chrome is big smooth folds, and every extra octave turns it into oil on water
  return gnoise(p + 1.6 * q);
}
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = uv * asp * uScale;
  float e = 0.02;
  float h = height(p);
  vec2 g = vec2(height(p + vec2(e, 0.0)) - h, height(p + vec2(0.0, e)) - h) / e;
  vec3 n = normalize(vec3(-g * uDepth * 0.6, 1.0));
  // a striped "studio" reflected in the surface: bright strips on black
  float r = n.x * 1.3 + n.y * 0.8;
  float strip = 0.5 + 0.5 * sin(r * uStreaks * 3.14159 + h * 2.0);
  float light = pow(strip, 9.0);
  vec3 below = texture(uPrev, uv + n.xy * 0.06 / asp).rgb;
  vec3 body = mix(vec3(0.03, 0.03, 0.05), below, uTint) * (0.15 + 0.85 * strip * strip);
  // the rainbow sits on the shoulders of each highlight, where a thin film splits light
  float shoulder = pow(strip, 3.0) * (1.0 - light);
  vec3 col = body + vec3(light) + spectrum(r * 0.9 + h * 0.8) * shoulder * uIris * 1.1;
  return vec4(col, 1.0);
}`,
};
```

`src/layers/satin.ts`:

```ts
import type { LayerDef } from "./types";

export const satin: LayerDef = {
  id: "satin",
  kind: "surface",
  label: "Satin folds",
  defaults: { folds: 3, amount: 0.6, twist: 0.6, angle: 30, flow: 1 },
  controls: [
    { key: "folds", label: "Folds", type: "range", min: 0.5, max: 12, step: 0.1 },
    { key: "amount", label: "Amount", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "twist", label: "Twist", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uFolds: p.folds as number, uAmount: p.amount as number, uTwist: p.twist as number, uAngle: p.angle as number, uFlow: p.flow as number }),
  fragment: `
uniform float uFolds, uAmount, uTwist, uAngle, uFlow;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a));
  float w = fbm(p * 1.3 + vec2(0.0, uTime * uFlow * 0.05), 2) * uTwist;
  float x = dot(p, d) * uFolds + w * 3.0 + sin(dot(p, vec2(-d.y, d.x)) * 2.0 + w * 2.0) * 0.5;
  float sh = 0.5 + 0.5 * sin(x * 3.14159);
  // cloth: the fold bends the picture slightly, valleys darken, ridges catch a soft highlight
  vec3 c = texture(uPrev, uv + d / asp * (sh - 0.5) * 0.04 * uAmount).rgb;
  c *= 1.0 - uAmount * 0.65 * (1.0 - sh) * (1.0 - sh);
  c += uAmount * 0.22 * pow(sh, 8.0);
  return vec4(c, 1.0);
}`,
};
```

`src/layers/prism.ts`:

```ts
import type { LayerDef } from "./types";

export const prism: LayerDef = {
  id: "prism",
  kind: "surface",
  label: "Prism streaks",
  defaults: { count: 5, angle: 55, width: 0.05, length: 0.5, dispersion: 0.8, amount: 0.9 },
  controls: [
    { key: "count", label: "Streaks", type: "range", min: 1, max: 8, step: 1 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "width", label: "Width", type: "range", min: 0.005, max: 0.3, step: 0.005 },
    { key: "length", label: "Length", type: "range", min: 0.05, max: 2, step: 0.01 },
    { key: "dispersion", label: "Rainbow", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "amount", label: "Brightness", type: "range", min: 0, max: 2, step: 0.01 },
  ],
  uniforms: (p) => ({ uCount: p.count as number, uAngle: p.angle as number, uWidth: p.width as number, uLength: p.length as number, uDispersion: p.dispersion as number, uAmount: p.amount as number }),
  fragment: `
uniform float uCount, uAngle, uWidth, uLength, uDispersion, uAmount;
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    float fi = float(i);
    vec2 c = vec2(hash21(vec2(fi, 3.1)), hash21(vec2(fi, 7.7)));
    float a = radians(uAngle) + (hash21(vec2(fi, 11.9)) - 0.5) * 0.35;
    vec2 d = vec2(cos(a), sin(a));
    vec2 q = (uv - c) * asp;
    float along = dot(q, d), across = dot(q, vec2(-d.y, d.x));
    float w = uWidth * (0.4 + 1.2 * hash21(vec2(fi, 5.3)));
    float len = uLength * (0.5 + hash21(vec2(fi, 2.2)));
    float beam = exp(-across * across / (w * w)) * exp(-along * along / (len * len));
    // light is split across the width of the streak, so one edge is red and the other violet
    vec3 col = mix(vec3(1.0), spectrum(across / w * 0.42 + 0.5) * 1.3, uDispersion);
    acc += col * beam * (0.35 + 0.65 * hash21(vec2(fi, 9.4)));
  }
  return vec4(texture(uPrev, uv).rgb + acc * uAmount, 1.0);
}`,
};
```

`src/layers/beams.ts`:

```ts
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
```

- [ ] **Step 3: Register them**

In `src/layers/index.ts`, add the imports (keep the list alphabetical by path):

```ts
import { holoFoil } from "./holo-foil";
import { chrome } from "./chrome";
import { satin } from "./satin";
import { prism } from "./prism";
import { beams } from "./beams";
```

and append to the end of the `allLayers` array, in this order: `holoFoil`, `chrome`, `satin`, `prism`, `beams`.

- [ ] **Step 4: Add the presets**

In `src/lib/presets.ts`, append inside the `PRESETS` array:

```ts
make("Pearl Foil", 21, [layer("mesh", { colors: ["#f4f0ff", "#cfe0ff", "#ffe0f0", "#e8fff4"], sharpness: 2 }), layer("holo-foil"), layer("grain", { amount: 0.05 })]),
  make("Liquid Chrome", 40, [layer("linear", { colors: ["#000000", "#05050a"] }), layer("chrome", { tint: 0, scale: 0.5, streaks: 1.2, iris: 1 }), layer("grain", { amount: 0.05 })]),
  make("Chrome Tide", 23, [layer("mesh", { colors: ["#02030a", "#1e3fff", "#9fd3ff", "#ff7a3d"] }), layer("chrome", { tint: 0.8, iris: 0.9 }), layer("grain", { amount: 0.05 })]),
  make("Silk Orchid", 24, [layer("linear", { colors: ["#2a0a3a", "#b83280", "#ffc2d9"], angle: 40 }), layer("satin")]),
  make("Opal Satin", 41, [layer("mesh", { colors: ["#f4f0ff", "#cfe0ff", "#ffe0f0", "#e8fff4"] }), layer("holo-foil", { pastel: 0.6 }), layer("satin", { amount: 0.5, folds: 2 })]),
  make("Prism Leak", 25, [layer("linear", { colors: ["#050508", "#0c0c12"] }), layer("prism"), layer("grain", { amount: 0.06 })]),
  make("Cathedral", 26, [layer("linear", { colors: ["#02040c", "#0b1d51", "#123a8c"] }), layer("beams"), layer("grain", { amount: 0.06 })]),
```

- [ ] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS. Three new tests per layer, one round-trip test per new preset, and the registry and "presets cover every layer" tests green.

- [ ] **Step 6: Run the browser tests**

Run: `npm run e2e`
Expected: PASS, same count as before. "every layer compiles and draws" now also covers the new layers, and fails with a `[gradient-f] layer "…" failed to compile` message if a shader is wrong.

- [ ] **Step 7: Look at it**

Run: `npm run dev` (if not running), then `npm run build:embed`, then `node scripts/render.mjs`.
Open each file and compare with `docs/superpowers/plans/assets/wave-2-reference.jpg`:

- `out/presets/pearl-foil.png` — **Pearl Foil:** Pastel rainbow in broad, soft, marbled bands across the whole image, like the back of a CD case seen through tracing paper. No hard lines.
- `out/presets/liquid-chrome.png` — **Liquid Chrome:** Black, with a few thick, smooth, bright white ribbons that curve like poured metal, and a hint of green and magenta on their edges. If it looks like many thin contour lines (oil on water), the height field is too detailed: check that `height()` uses a single `gnoise`.
- `out/presets/chrome-tide.png` — **Chrome Tide:** Same folds, with the blue and orange of the mesh showing in the dark body and coloured fringes on the highlights.
- `out/presets/silk-orchid.png` — **Silk Orchid:** A plum-to-pink fade crossed by two or three soft diagonal folds with a gentle sheen, like draped cloth.
- `out/presets/opal-satin.png` — **Opal Satin:** The pearl foil, softened and given cloth-like folds.
- `out/presets/prism-leak.png` — **Prism Leak:** Near-black, with four or five thin diagonal streaks, each split into a rainbow across its width (red on one edge through green to violet on the other), fading out along its length.
- `out/presets/cathedral.png` — **Cathedral:** Deep blue, with pale warm rays fanning down from above the top edge, brightest at the top centre, with clear gaps between rays.

If an image does not match its description, the shader was mistyped or a shared function changed: fix the cause. Do not adjust the preset to hide it.

- [ ] **Step 8: Commit**

```bash
git add src/layers src/lib/presets.ts && git commit -m "Add holo-foil, chrome, satin, prism, beams layers and presets"
```

---

### Task 2: Shapes: blurred shapes, rings and arcs

**Files:**
- Create: `src/layers/shapes.ts`, `src/layers/rings.ts`
- Modify: `src/layers/index.ts`, `src/layers/layers.test.ts` (registry test), `src/lib/presets.ts`

**Interfaces:**
- Consumes: `LayerDef`, `colorUniforms`, `centreHandle` from `src/layers/types.ts`; `PICK` from `src/layers/glsl.ts`; shared GLSL from `src/engine/glsl/common.ts` (see `docs/LAYERS.md`).
- Produces: layer ids `shapes`, `rings`, exported as `shapes`, `rings`.

- [ ] **Step 1: Extend the registry test so it fails**

In `src/layers/layers.test.ts`, in the test "registry has the … layers and ignores prototype keys", set the expected id list to:

```ts
expect(allLayers.map((l) => l.id)).toEqual(["linear","radial","mesh","warp","fluted-glass","grain","halftone","dither","holo-foil","chrome","satin","prism","beams","shapes","rings"]);
```

Run: `npm test`
Expected: FAIL in the registry test; the received list has 13 ids, the expected list 15.

- [ ] **Step 2: Create the layer files**

`src/layers/shapes.ts`:

```ts
import { colorUniforms, type LayerDef } from "./types";

const SHAPES = ["circle", "sparkle", "ring"];

export const shapes: LayerDef = {
  id: "shapes",
  kind: "base",
  label: "Blurred shapes",
  defaults: { colors: ["#eef1ff", "#ff9a8b", "#7aa2ff", "#ffd3a5"], count: 4, size: 0.3, blur: 0.7, shape: "circle", motion: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "count", label: "Shapes", type: "range", min: 1, max: 8, step: 1 },
    { key: "size", label: "Size", type: "range", min: 0.03, max: 0.8, step: 0.01 },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "shape", label: "Shape", type: "select", options: SHAPES },
    { key: "motion", label: "Motion", type: "range", min: 0, max: 3, step: 0.05 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uCount: p.count as number, uSize: p.size as number, uBlur: p.blur as number, uShape: SHAPES.indexOf(p.shape as string), uMotion: p.motion as number }),
  fragment: `
uniform float uCount, uSize, uBlur, uShape, uMotion;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec3 acc = toOklab(uColors[0]); // the first colour is the background
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    float fi = float(i);
    vec2 c = vec2(hash21(vec2(fi, 1.3)), hash21(vec2(fi, 8.1)));
    c += 0.06 * uMotion * vec2(sin(uTime * 0.3 + fi * 2.1), cos(uTime * 0.23 + fi * 1.3));
    vec2 q = (uv - c) * asp;
    float s = uSize * (0.5 + hash21(vec2(fi, 4.4)));
    float d = length(q) - s;
    if (uShape > 1.5) d = abs(length(q) - s) - s * 0.18;
    else if (uShape > 0.5) { float k = sqrt(abs(q.x)) + sqrt(abs(q.y)); d = k * k - s; }
    float soft = max(uBlur * s, 1.5 / uRes.y);
    float cover = 1.0 - smoothstep(-soft, soft, d);
    acc = mix(acc, toOklab(uColors[1 + int(mod(fi, float(uColorCount - 1)))]), cover * (0.6 + 0.4 * hash21(vec2(fi, 6.6))));
  }
  return vec4(fromOklab(acc), 1.0);
}`,
};
```

`src/layers/rings.ts`:

```ts
import { PICK } from "./glsl";
import { centreHandle, colorUniforms, type LayerDef } from "./types";

export const rings: LayerDef = {
  id: "rings",
  kind: "base",
  label: "Rings and arcs",
  defaults: { colors: ["#12082e", "#5b2ff7", "#f107a3", "#ffb347"], cx: 0.5, cy: 0, count: 6, fade: 0.6, stretch: 1 },
  controls: [
    { key: "colors", label: "Colours", type: "color-list", min: 2, max: 6 },
    { key: "cx", label: "Centre X", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "cy", label: "Centre Y", type: "range", min: -0.5, max: 1.5, step: 0.01 },
    { key: "count", label: "Rings", type: "range", min: 1, max: 30, step: 0.5 },
    { key: "fade", label: "Fade", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "stretch", label: "Stretch", type: "range", min: 0.25, max: 4, step: 0.01 },
  ],
  ...centreHandle("cx", "cy", "Centre"),
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uCenter: [p.cx as number, p.cy as number], uCount: p.count as number, uFade: p.fade as number, uStretch: p.stretch as number }),
  fragment: `${PICK}
uniform vec2 uCenter;
uniform float uCount, uFade, uStretch;
vec4 layer(vec2 uv) {
  vec2 q = (uv - uCenter) * vec2(uRes.x / uRes.y / uStretch, 1.0);
  float r = length(q) * uCount;
  float i = floor(r), f = fract(r);
  // fade 0: flat bands with a crisp edge. fade 1: each ring melts evenly into the next.
  float k = pow(f, mix(40.0, 1.0, uFade));
  return vec4(mixOk(pick(i), pick(i + 1.0), k), 1.0);
}`,
};
```

- [ ] **Step 3: Register them**

In `src/layers/index.ts`, add the imports (keep the list alphabetical by path):

```ts
import { shapes } from "./shapes";
import { rings } from "./rings";
```

and append to the end of the `allLayers` array, in this order: `shapes`, `rings`.

- [ ] **Step 4: Add the presets**

In `src/lib/presets.ts`, append inside the `PRESETS` array:

```ts
make("Soft Orbs", 29, [layer("shapes"), layer("grain", { amount: 0.06 })]),
  make("Starlight", 30, [layer("shapes", { colors: ["#fff4f0", "#ff8a5c", "#ffb3c7"], shape: "sparkle", blur: 0.35, count: 5, size: 0.25 }), layer("grain", { amount: 0.08, mode: "edge" })]),
  make("Sunrise Arcs", 35, [layer("rings"), layer("grain", { amount: 0.08 })]),
  make("Seventies", 36, [layer("rings", { colors: ["#f3e6d0", "#e07a2f", "#8a3b12", "#3a1d0c"], fade: 0, cx: 0, cy: 0, count: 9 })]),
```

- [ ] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS. Three new tests per layer, one round-trip test per new preset, and the registry and "presets cover every layer" tests green.

- [ ] **Step 6: Run the browser tests**

Run: `npm run e2e`
Expected: PASS, same count as before. "every layer compiles and draws" now also covers the new layers, and fails with a `[gradient-f] layer "…" failed to compile` message if a shader is wrong.

- [ ] **Step 7: Look at it**

Run: `npm run dev` (if not running), then `npm run build:embed`, then `node scripts/render.mjs`.
Open each file and compare with `docs/superpowers/plans/assets/wave-2-reference.jpg`:

- `out/presets/soft-orbs.png` — **Soft Orbs:** A pale background with a few very soft, out-of-focus discs of peach and blue, mostly near the edges.
- `out/presets/starlight.png` — **Starlight:** A cream background with five soft four-pointed sparkles in orange and pink, of different sizes.
- `out/presets/sunrise-arcs.png` — **Sunrise Arcs:** Concentric half-rings rising from the bottom centre in violet, magenta, amber and near-black, each ring fading softly into the next.
- `out/presets/seventies.png` — **Seventies:** Quarter-circle bands from the bottom-left corner in cream, orange and browns, with crisp edges and flat colour.

If an image does not match its description, the shader was mistyped or a shared function changed: fix the cause. Do not adjust the preset to hide it.

- [ ] **Step 8: Commit**

```bash
git add src/layers src/lib/presets.ts && git commit -m "Add shapes, rings layers and presets"
```

---

### Task 3: Glass: frosted glass and tiled glass

**Files:**
- Create: `src/layers/frosted-glass.ts`, `src/layers/tiled-glass.ts`
- Modify: `src/layers/index.ts`, `src/layers/layers.test.ts` (registry test), `src/lib/presets.ts`

**Interfaces:**
- Consumes: `LayerDef`, `colorUniforms`, `centreHandle` from `src/layers/types.ts`; `PICK` from `src/layers/glsl.ts`; shared GLSL from `src/engine/glsl/common.ts` (see `docs/LAYERS.md`).
- Produces: layer ids `frosted-glass`, `tiled-glass`, exported as `frostedGlass`, `tiledGlass`.

**Order:** the `Frosted Peach` preset uses the `shapes` layer from Task 2, so Task 2 must be done first.

- [ ] **Step 1: Extend the registry test so it fails**

In `src/layers/layers.test.ts`, in the test "registry has the … layers and ignores prototype keys", set the expected id list to:

```ts
expect(allLayers.map((l) => l.id)).toEqual(["linear","radial","mesh","warp","fluted-glass","grain","halftone","dither","holo-foil","chrome","satin","prism","beams","shapes","rings","frosted-glass","tiled-glass"]);
```

Run: `npm test`
Expected: FAIL in the registry test; the received list has 15 ids, the expected list 17.

- [ ] **Step 2: Create the layer files**

`src/layers/frosted-glass.ts`:

```ts
import { colorUniforms, type LayerDef } from "./types";

export const frostedGlass: LayerDef = {
  id: "frosted-glass",
  kind: "surface",
  label: "Frosted glass",
  defaults: { colors: ["#ffffff"], blur: 0.06, frost: 0.6, milk: 0.15 },
  controls: [
    { key: "colors", label: "Glass tint", type: "color-list", min: 1, max: 1 },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 0.25, step: 0.005 },
    { key: "frost", label: "Frost", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "milk", label: "Milkiness", type: "range", min: 0, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uBlur: p.blur as number, uFrost: p.frost as number, uMilk: p.milk as number }),
  fragment: `
uniform float uBlur, uFrost, uMilk;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  // 24 samples on a golden-angle spiral; turning the spiral per pixel trades banding for a fine frosted sparkle
  float turn = hash21(gl_FragCoord.xy) * 6.2831853 * uFrost;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 24.0) * uBlur;
    float a = fi * 2.39996323 + turn;
    acc += texture(uPrev, uv + r * vec2(cos(a), sin(a)) / asp).rgb;
  }
  return vec4(mix(acc / 24.0, uColors[0], uMilk * 0.7), 1.0);
}`,
};
```

`src/layers/tiled-glass.ts`:

```ts
import type { LayerDef } from "./types";

export const tiledGlass: LayerDef = {
  id: "tiled-glass",
  kind: "surface",
  label: "Tiled glass",
  defaults: { count: 12, shift: 1.4, lens: 0.8, bevel: 0.1, angle: 0 },
  controls: [
    { key: "count", label: "Tiles", type: "range", min: 2, max: 60, step: 1 },
    { key: "shift", label: "Tile offset", type: "range", min: 0, max: 3, step: 0.01 },
    { key: "lens", label: "Lens", type: "range", min: -2, max: 2, step: 0.01 },
    { key: "bevel", label: "Bevel", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 90, step: 1 },
  ],
  uniforms: (p) => ({ uCount: p.count as number, uShift: p.shift as number, uLens: p.lens as number, uBevel: p.bevel as number, uAngle: p.angle as number }),
  fragment: `
uniform float uCount, uShift, uLens, uBevel, uAngle;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float a = radians(uAngle);
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 g = rot * ((uv - 0.5) * asp) * uCount;
  vec2 id = floor(g), f = fract(g) - 0.5;
  // each tile shows the picture from a slightly different place, and bends it like a small lens
  vec2 off = (vec2(hash21(id), hash21(id + 7.3)) - 0.5) * uShift - f * uLens;
  vec3 c = texture(uPrev, uv + transpose(rot) * off / uCount / asp).rgb;
  float edge = max(abs(f.x), abs(f.y));
  c *= 1.0 - uBevel * smoothstep(0.4, 0.5, edge);
  c += uBevel * 0.12 * smoothstep(0.3, 0.5, f.y) * smoothstep(0.5, 0.4, edge);
  return vec4(c, 1.0);
}`,
};
```

- [ ] **Step 3: Register them**

In `src/layers/index.ts`, add the imports (keep the list alphabetical by path):

```ts
import { frostedGlass } from "./frosted-glass";
import { tiledGlass } from "./tiled-glass";
```

and append to the end of the `allLayers` array, in this order: `frostedGlass`, `tiledGlass`.

- [ ] **Step 4: Add the presets**

In `src/lib/presets.ts`, append inside the `PRESETS` array:

```ts
make("Frosted Peach", 27, [layer("shapes", { blur: 0.15 }), layer("frosted-glass")]),
  make("Glass Blocks", 28, [layer("mesh"), layer("warp", { amount: 0.2 }), layer("tiled-glass")]),
```

- [ ] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS. Three new tests per layer, one round-trip test per new preset, and the registry and "presets cover every layer" tests green.

- [ ] **Step 6: Run the browser tests**

Run: `npm run e2e`
Expected: PASS, same count as before. "every layer compiles and draws" now also covers the new layers, and fails with a `[gradient-f] layer "…" failed to compile` message if a shader is wrong.

- [ ] **Step 7: Look at it**

Run: `npm run dev` (if not running), then `npm run build:embed`, then `node scripts/render.mjs`.
Open each file and compare with `docs/superpowers/plans/assets/wave-2-reference.jpg`:

- `out/presets/frosted-peach.png` — **Frosted Peach:** Three or four pastel discs on a pale background, their edges blurred to a soft glow, with a faint milky veil. No visible dots or rings from the blur.
- `out/presets/glass-blocks.png` — **Glass Blocks:** A blue mesh seen through a grid of square glass blocks: each block shows a slightly shifted, slightly magnified piece of the picture, so colour boundaries break into steps. Block edges are faint, not a drawn grid.

If an image does not match its description, the shader was mistyped or a shared function changed: fix the cause. Do not adjust the preset to hide it.

- [ ] **Step 8: Commit**

```bash
git add src/layers src/lib/presets.ts && git commit -m "Add frosted-glass, tiled-glass layers and presets"
```

---

### Task 4: Distortion: wave ribbons and melt

**Files:**
- Create: `src/layers/ribbons.ts`, `src/layers/melt.ts`
- Modify: `src/layers/index.ts`, `src/layers/layers.test.ts` (registry test), `src/lib/presets.ts`

**Interfaces:**
- Consumes: `LayerDef`, `colorUniforms`, `centreHandle` from `src/layers/types.ts`; `PICK` from `src/layers/glsl.ts`; shared GLSL from `src/engine/glsl/common.ts` (see `docs/LAYERS.md`).
- Produces: layer ids `ribbons`, `melt`, exported as `ribbons`, `melt`.

- [ ] **Step 1: Extend the registry test so it fails**

In `src/layers/layers.test.ts`, in the test "registry has the … layers and ignores prototype keys", set the expected id list to:

```ts
expect(allLayers.map((l) => l.id)).toEqual(["linear","radial","mesh","warp","fluted-glass","grain","halftone","dither","holo-foil","chrome","satin","prism","beams","shapes","rings","frosted-glass","tiled-glass","ribbons","melt"]);
```

Run: `npm test`
Expected: FAIL in the registry test; the received list has 17 ids, the expected list 19.

- [ ] **Step 2: Create the layer files**

`src/layers/ribbons.ts`:

```ts
import type { LayerDef } from "./types";

export const ribbons: LayerDef = {
  id: "ribbons",
  kind: "distort",
  label: "Wave ribbons",
  defaults: { amplitude: 0.15, frequency: 1.2, twist: 0.5, angle: 0, flow: 1 },
  controls: [
    { key: "amplitude", label: "Height", type: "range", min: 0, max: 0.5, step: 0.005 },
    { key: "frequency", label: "Waves", type: "range", min: 0.2, max: 6, step: 0.05 },
    { key: "twist", label: "Twist", type: "range", min: 0, max: 2, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmp: p.amplitude as number, uFreq: p.frequency as number, uTwist: p.twist as number, uAngle: p.angle as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmp, uFreq, uTwist, uAngle, uFlow;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a)), n = vec2(-d.y, d.x);
  float t = uTime * uFlow * 0.3;
  float w = fbm(p * 1.2 + vec2(t * 0.2, 0.0), 2) * uTwist;
  // slide the picture across the wave direction: a flat fade becomes a ribbon
  float wave = sin(dot(p, d) * uFreq * 6.2831853 + w * 4.0 + t) + 0.25 * sin(dot(p, d) * uFreq * 2.3 * 6.2831853 + w * 5.0 - t);
  return vec4(texture(uPrev, uv + n / asp * uAmp * (wave * 0.8 + w)).rgb, 1.0);
}`,
};
```

`src/layers/melt.ts`:

```ts
import type { LayerDef } from "./types";

export const melt: LayerDef = {
  id: "melt",
  kind: "distort",
  label: "Melt",
  defaults: { amount: 0.2, frequency: 10, jag: 0.5, angle: 0, flow: 1 },
  controls: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 0.6, step: 0.005 },
    { key: "frequency", label: "Columns", type: "range", min: 1, max: 60, step: 0.5 },
    { key: "jag", label: "Jaggedness", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1 },
    { key: "flow", label: "Flow speed", type: "range", min: 0, max: 4, step: 0.05 },
  ],
  uniforms: (p) => ({ uAmount: p.amount as number, uFreq: p.frequency as number, uJag: p.jag as number, uAngle: p.angle as number, uFlow: p.flow as number }),
  fragment: `
uniform float uAmount, uFreq, uJag, uAngle, uFlow;
vec4 layer(vec2 uv) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float a = radians(uAngle);
  vec2 d = vec2(cos(a), sin(a)), n = vec2(-d.y, d.x);
  float x = dot(p, d) * uFreq;
  float t = uTime * uFlow * 0.1;
  float smoothDrip = fbm(vec2(x * 0.5, t), 3) * 1.6;
  // zigzag: a triangle wave whose every tooth has its own height
  float tooth = abs(fract(x) - 0.5) * 2.0;
  float zig = (1.0 - tooth) * (0.3 + 0.7 * hash21(vec2(floor(x), 2.0))) + fbm(vec2(x * 0.15, 9.0 + t), 2) - 0.5;
  return vec4(texture(uPrev, uv + n / asp * uAmount * mix(smoothDrip, zig, uJag)).rgb, 1.0);
}`,
};
```

- [ ] **Step 3: Register them**

In `src/layers/index.ts`, add the imports (keep the list alphabetical by path):

```ts
import { ribbons } from "./ribbons";
import { melt } from "./melt";
```

and append to the end of the `allLayers` array, in this order: `ribbons`, `melt`.

- [ ] **Step 4: Add the presets**

In `src/lib/presets.ts`, append inside the `PRESETS` array:

```ts
make("Ribbon", 32, [layer("linear", { colors: ["#f6f4ff", "#f6f4ff", "#3b5bff", "#ff7ab8", "#f6f4ff", "#f6f4ff"], spread: 0.6 }), layer("ribbons", { amplitude: 0.2 }), layer("grain", { amount: 0.06, mode: "edge" })]),
  make("Flame Melt", 33, [layer("linear", { colors: ["#ff8a00", "#e52e1a", "#6a3fd6", "#b7a5e8"] }), layer("melt", { amount: 0.3, jag: 0.8 }), layer("grain", { amount: 0.07 })]),
  make("Slow Melt", 34, [layer("linear", { colors: ["#000000", "#ff3d00", "#ffb199", "#f4e9e4"] }), layer("melt", { amount: 0.35, jag: 0, frequency: 6 })]),
```

- [ ] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS. Three new tests per layer, one round-trip test per new preset, and the registry and "presets cover every layer" tests green.

- [ ] **Step 6: Run the browser tests**

Run: `npm run e2e`
Expected: PASS, same count as before. "every layer compiles and draws" now also covers the new layers, and fails with a `[gradient-f] layer "…" failed to compile` message if a shader is wrong.

- [ ] **Step 7: Look at it**

Run: `npm run dev` (if not running), then `npm run build:embed`, then `node scripts/render.mjs`.
Open each file and compare with `docs/superpowers/plans/assets/wave-2-reference.jpg`:

- `out/presets/ribbon.png` — **Ribbon:** A near-white page crossed left to right by one soft blue-and-pink ribbon that rises and falls in three or four smooth waves.
- `out/presets/flame-melt.png` — **Flame Melt:** Orange at the bottom through red to violet at the top, with the boundaries pulled into sharp vertical zigzag teeth of varying height, like flames.
- `out/presets/slow-melt.png` — **Slow Melt:** Black at the bottom through orange-red to pale peach, with the boundaries dripping in soft, uneven vertical drips.

If an image does not match its description, the shader was mistyped or a shared function changed: fix the cause. Do not adjust the preset to hide it.

- [ ] **Step 8: Commit**

```bash
git add src/layers src/lib/presets.ts && git commit -m "Add ribbons, melt layers and presets"
```

---

### Task 5: Edge-of-range and heavy-stack tests

**Files:**
- Modify: `e2e/render.spec.ts` (append two tests)

**Interfaces:**
- Consumes: `open(page)`, `probe(page, recipe, w, h)`, `recipeOf(...layers)`, `layer(type, overrides)` and `allLayers`, all already defined or imported at the top of `e2e/render.spec.ts`.
- Produces: nothing for later tasks.

- [ ] **Step 1: Append the tests**

At the end of `e2e/render.spec.ts`:

```ts
const WAVE_2 = ["holo-foil","chrome","satin","prism","beams","shapes","rings","frosted-glass","tiled-glass","ribbons","melt"];

test("new layers survive the ends of their ranges", async ({ page }) => {
  const errors = await open(page);
  for (const def of allLayers.filter((d) => WAVE_2.includes(d.id))) {
    for (const end of ["min", "max"] as const) {
      const params: Record<string, number> = {};
      for (const c of def.controls) if (c.type === "range") params[c.key] = c[end];
      // alone, reading black below it: must export without throwing
      expect((await probe(page, recipeOf(layer(def.id, params)), 96, 96)).w, `${def.id} alone at ${end}`).toBe(96);
      // over a mesh: a NaN reaches the canvas as black, so a blacked-out frame shows up as a single colour
      expect((await probe(page, recipeOf(layer("mesh"), layer(def.id, params)), 96, 96)).distinct, `${def.id} over mesh at ${end}`).toBeGreaterThan(1);
    }
  }
  // one colour where one is allowed
  expect((await probe(page, recipeOf(layer("mesh"), layer("beams", { colors: ["#ffffff"] })), 96, 96)).distinct).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test("heavy stack exports at 4K", async ({ page }) => {
  await open(page);
  const out = await probe(page, recipeOf(layer("mesh"), layer("chrome", { tint: 0.8 }), layer("frosted-glass"), layer("tiled-glass"), layer("holo-foil", { amount: 0.4 }), layer("grain")), 3840, 2160);
  expect([out.w, out.h]).toEqual([3840, 2160]);
  expect(out.distinct).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run them**

Run: `npm run e2e`
Expected: PASS, two more tests than before.

If "heavy stack exports at 4K" times out or loses the context under software rendering, run it once on real hardware by temporarily removing `launchOptions` from `playwright.config.ts`. If it passes there, restore `launchOptions`, mark the test `test.skip(!!process.env.CI, "needs a real GPU")`, and record the timing in `docs/HANDOFF.md`. If it fails on real hardware too, stop and report: the spec's open risk about 4K with six float passes has come true and needs a decision (fewer blur samples at large sizes, or tiled export).

If "new layers survive the ends of their ranges" reports a shader error or a thrown export for one layer, fix that layer's maths for the failing end (clamp the value inside the shader) and note the change in the layer's file with a one-line comment saying which input needed it.

- [ ] **Step 3: Update the docs**

In `docs/LAYERS.md`, add the eleven layers to the table "The layers that exist" (id, label, kind, controls), and remove them from the "Still to build" sentence. In `docs/HANDOFF.md`, move wave 2 from "not started" to done and update the type count to 19 of 25.

- [ ] **Step 4: Commit**

```bash
git add e2e docs && git commit -m "Test wave 2 layers at range ends and at 4K; update docs"
```

---

## After this plan

1. **Tune every preset with the owner**, old and new: `docs/PRESET-TUNING.md`. The sixteen presets added here were looked at once and are reasonable starting points, not approved.
2. **Last five types:** thermal contour, line screen, gradient bars, layered waves, retro stripes and sunbursts. `PICK` in `src/layers/glsl.ts` was written for the hard-banded ones.
3. Liquid chrome is a shader approximation of what are 3D renders in the references. If the owner wants it closer, the next step is a real environment map and a second bounce, not more noise.

# Cursor Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a gradient react to the cursor (colours follow, liquid push, spotlight), as an opt-in part of its recipe, so embeds on other sites react too.

**Architecture:** Cursor effects are ordinary layers and layer params, not a new recipe section. The engine gains three shared shader inputs (cursor position, cursor velocity, hover strength); the `<gradient-f>` element tracks and smooths the cursor and passes them to the renderer. Because effects are layers, validation, share links, the studio's controls and embeds all work with no new schema. With no cursor, every effect multiplies by a hover strength of zero and returns its input bit for bit.

**Tech Stack:** TypeScript, GLSL ES 3.00 (WebGL2), Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-gradient-studio-design.md` (this feature is an addition to it; the decisions below are the owner's, recorded 2026-11-12 and 2026-11-13).

**Read first:** `docs/LAYERS.md`, and `src/embed/gradient-f.ts` in full.

## Decisions from the owner

| Question | Answer |
|---|---|
| What reacts to the cursor? | The gradients themselves, not the gallery cards or the site chrome. |
| Where does the behaviour live? | In the recipe, so it travels with share links and embeds. |
| Which effects? | Colours follow, liquid push, spotlight. |
| On every gradient? | **No.** "I don't want cursor effect on everything." Effects are off unless a gradient's recipe asks for them. |

What "not on everything" means in this plan:

- No existing preset, share link or embed changes. `follow` defaults to 0 and the two cursor layers exist only where someone adds them.
- The site shows the feature in three places only: the landing-page hero and two new presets. Gallery thumbnails stay still images.
- In the studio, the cursor layers sit in their own "Cursor effects" group in the add-layer menu, and "Follow cursor" is one slider on Mesh blur and Aura glow, at 0.

## How this was checked

On 2026-11-13 the engine edits in Task 1 and the shader code in Task 2 were applied to a scratch copy of `src` at commit `11f6dcc`, bundled, and rendered through software WebGL:

- All shaders compiled with no errors.
- Six recipes were rendered at rest and with a cursor at (0.35, 0.6). Push, spotlight and follow all visibly respond.
- For all six, the frame at rest was **byte-identical** to the same recipe with the cursor layers and `follow` removed.
- `docs/superpowers/plans/assets/cursor-effects-reference.jpg` is the contact sheet: each pair is the frame at rest, then with the cursor at the small circle.
- One defect was found and fixed in the code below: `follow: 1` on a mesh originally pulled every nearby blob onto the cursor, making a pinch. The pull is now capped so blobs lean toward the cursor.

Not checked: everything in Task 3 (the element's cursor tracking, smoothing and frame loop) has not been run. Nor have the unit and browser suites with these changes, touch input, or real graphics hardware.

## Global Constraints

- **No cursor means no change.** With `uHover` at 0, every layer must return exactly what it would without the feature. Write effects as "input plus something times `uHover`", never as a formula that only approximately equals the input. A browser test enforces this.
- PNG export, gallery thumbnails and server rendering never include cursor effects.
- `prefers-reduced-motion: reduce` turns cursor effects off, the same rule the element uses for animation.
- The element listens for the cursor only while connected **and** its recipe uses it. A static gradient with no cursor effect adds no listeners and runs no frames.
- When the cursor stops and the effect has settled, the frame loop stops (unless the recipe animates).
- Pointer position is in the shader's UV space: 0..1, y up.
- Layer ids `cursor-push` and `cursor-light` are permanent once committed.
- No new dependencies. Code under `src/engine`, `src/layers`, `src/lib`, `src/embed` uses relative imports only.

## Review Focus

1. **Text and buttons on top of the gradient** (the hero) → the effect still follows the cursor. This is why the element listens on `window`, not on itself. *Test: Task 3, "cursor effect works under overlaid content".*
2. **Cursor leaves the window, the tab loses focus, or a touch ends** → the effect fades out and the loop stops; it must not freeze half-lit. *Test: Task 3, "effect fades and the loop stops when the cursor leaves".*
3. **The page scrolls under a still cursor** → the effect moves to where the cursor now is over the gradient. *Test: Task 3, same test, scroll step.*
4. **The recipe attribute changes from interactive to not, or the element is removed** → listeners are removed. *Test: Task 3, "listeners follow the recipe".*
5. **A cursor layer is the only layer, or is first** → renders (over black), no error. *Covered: "every layer compiles and draws" stacks each layer over a mesh, and "new layers survive the ends of their ranges" pattern is extended to the two cursor layers in Task 2.*

---

### Task 1: Engine inputs

**Files:**
- Modify: `src/engine/glsl/common.ts`, `src/engine/renderer.ts`, `src/layers/types.ts`, `src/layers/index.ts`, `src/components/LayerStack.tsx`
- Test: `src/layers/layers.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: GLSL uniforms `uPointer` (vec2), `uPointerVel` (vec2), `uHover` (float), available to every layer; `type Pointer = { x; y; vx; vy; hover }` and `const REST: Pointer` from `src/engine/renderer.ts`; `Renderer.render(recipe, timeMs, pointer?)`; `LayerDef.kind` accepts `"cursor"`; optional `LayerDef.interactive?(p: Params): boolean`; `usesPointer(recipe: Recipe): boolean` from `src/layers/index.ts`.

- [ ] **Step 1: Write the failing test**

Append to `src/layers/layers.test.ts`, and add `usesPointer` to the import from `./index`:

```ts
test("usesPointer is false until a layer opts in", () => {
  const base = { v: 1 as const, seed: 1, frame: 0, speed: 0 };
  const mesh = { type: "mesh", params: {} };
  expect(usesPointer({ ...base, layers: [mesh] })).toBe(false);
  // every layer that exists today is non-interactive by default
  expect(usesPointer({ ...base, layers: allLayers.map((l) => ({ type: l.id, params: {} })) })).toBe(false);
  expect(usesPointer({ ...base, layers: [{ type: "nope", params: {} }] })).toBe(false);
});
```

Run: `npm test`
Expected: FAIL, `usesPointer` is not exported.

- [ ] **Step 2: Add the shader inputs**

In `src/engine/glsl/common.ts`, directly after the line `uniform float uSeed;` inside `COMMON`, add:

```glsl
// cursor, in the same space as vUv (0..1, y up); all three are at rest (hover 0) for stills, thumbnails and exports
uniform vec2 uPointer;
uniform vec2 uPointerVel;
uniform float uHover;
```

Unused uniforms are removed by the shader compiler, and the renderer sets only active ones, so layers that ignore the cursor pay nothing.

- [ ] **Step 3: Pass the pointer through the renderer**

In `src/engine/renderer.ts`, replace

```ts
export type Renderer = {
  render(recipe: Recipe, timeMs: number): void;
```

with

```ts
/** Smoothed cursor state in uv space (0..1, y up). `hover` is 0 when the cursor is away. */
export type Pointer = { x: number; y: number; vx: number; vy: number; hover: number };
export const REST: Pointer = { x: 0.5, y: 0.5, vx: 0, vy: 0, hover: 0 };

export type Renderer = {
  render(recipe: Recipe, timeMs: number, pointer?: Pointer): void;
```

Change `render(recipe, timeMs) {` to `render(recipe, timeMs, pointer = REST) {`.

In the `shared` object inside `render`, after `uBlend: 0`, add:

```ts
uPointer: [pointer.x, pointer.y], uPointerVel: [pointer.vx, pointer.vy], uHover: pointer.hover
```

`exportPng` and `Thumb` keep calling `render(recipe, 0)` and so always draw the resting state. Do not change them.

- [ ] **Step 4: Extend the layer contract**

In `src/layers/types.ts`, replace

```ts
  kind: "base" | "distort" | "surface" | "recolor" | "texture";
```

with

```ts
  kind: "base" | "distort" | "surface" | "recolor" | "texture" | "cursor";
  /** True when these params make the layer react to the cursor. Absent means never. */
  interactive?(p: Params): boolean;
```

- [ ] **Step 5: Add `usesPointer`**

In `src/layers/index.ts`, add this import beside the other type import (a type-only import, so the cycle with `lib/recipe.ts` is erased at build time):

```ts
import type { Recipe } from "../lib/recipe";
```

and append:

```ts
/** True when any visible layer reacts to the cursor, so the element knows whether to track it at all. */
export const usesPointer = (recipe: Recipe): boolean =>
  recipe.layers.some((l) => {
    const def = l.hidden ? undefined : getLayer(l.type);
    return !!def?.interactive?.({ ...def.defaults, ...l.params });
  });
```

- [ ] **Step 6: Give the new kind a menu group**

In `src/components/LayerStack.tsx`, add a row to `KINDS` after the `texture` row:

```ts
  ["cursor", "Cursor effects"],
```

- [ ] **Step 7: Run everything**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm test` — Expected: PASS, one more test than before.
Run: `npm run e2e` — Expected: PASS, same count. "presets render, and render the same twice" proves the new uniforms changed no existing image.

- [ ] **Step 8: Commit**

```bash
git add src && git commit -m "Engine: cursor position, velocity and hover as shared shader inputs"
```

---

### Task 2: The three effects

**Files:**
- Create: `src/layers/cursor-push.ts`, `src/layers/cursor-light.ts`
- Modify: `src/layers/mesh.ts`, `src/layers/radial.ts`, `src/layers/index.ts`, `src/layers/layers.test.ts`, `src/lib/presets.ts`, `src/lib/exportPng.ts`, `e2e/render.spec.ts`

**Interfaces:**
- Consumes: `uPointer`, `uPointerVel`, `uHover`, `LayerDef.interactive`, `Pointer`, `usesPointer` from Task 1.
- Produces: layer ids `cursor-push` and `cursor-light` (exported as `cursorPush`, `cursorLight`); a `follow` range param (0..1, default 0) on `mesh` and `radial`; `exportPng(recipe, width, height, pointer?)`.

- [ ] **Step 1: Write the failing tests**

In `src/layers/layers.test.ts`, add `"cursor-push", "cursor-light"` to the end of the expected id list in the registry test, and append to the `usesPointer` test:

```ts
  expect(usesPointer({ ...base, layers: [mesh, { type: "cursor-light", params: {} }] })).toBe(true);
  expect(usesPointer({ ...base, layers: [mesh, { type: "cursor-push", params: {}, hidden: true }] })).toBe(false);
  expect(usesPointer({ ...base, layers: [{ type: "mesh", params: { follow: 0.5 } }] })).toBe(true);
  expect(usesPointer({ ...base, layers: [{ type: "radial", params: { follow: 0 } }] })).toBe(false);
```

Append to `e2e/render.spec.ts`:

```ts
const HOVER = { x: 0.35, y: 0.6, vx: 0.6, vy: 0.1, hover: 1 };
const hashAt = (page: Page, recipe: Recipe, pointer?: typeof HOVER) =>
  page.evaluate(
    async ({ recipe, pointer }) => {
      const d = new Uint8Array(await (await window.GradientF.exportPng(recipe, 192, 108, pointer)).arrayBuffer());
      let h = 0;
      for (const v of d) h = (Math.imul(h, 31) + v) | 0;
      return h;
    },
    { recipe, pointer },
  );

test("with no cursor, cursor effects change nothing", async ({ page }) => {
  await open(page);
  const plain = recipeOf(layer("mesh"), layer("warp"), layer("radial", { cy: 0.2 }), layer("grain"));
  const withEffects = recipeOf(layer("mesh", { follow: 1 }), layer("warp"), layer("radial", { cy: 0.2, follow: 1 }), layer("cursor-push"), layer("cursor-light"), layer("grain"));
  // the radial repaints the frame, so compare it separately from the mesh
  expect(await hashAt(page, withEffects)).toBe(await hashAt(page, plain));
  expect(await hashAt(page, recipeOf(layer("mesh", { follow: 1 }), layer("cursor-push"), layer("cursor-light")))).toBe(await hashAt(page, recipeOf(layer("mesh"))));
});

test("each cursor effect responds to a cursor", async ({ page }) => {
  await open(page);
  for (const recipe of [
    recipeOf(layer("mesh", { follow: 1 })),
    recipeOf(layer("radial", { follow: 1 })),
    recipeOf(layer("rings"), layer("cursor-push")),
    recipeOf(layer("mesh"), layer("cursor-light")),
    recipeOf(layer("cursor-light")), // alone, over black
  ])
    expect(await hashAt(page, recipe, HOVER), recipe.layers.map((l) => l.type).join("+")).not.toBe(await hashAt(page, recipe));
});
```

Update the `Window` declaration at the top of `e2e/render.spec.ts` so `exportPng` accepts the fourth argument:

```ts
    GradientF: { exportPng(r: Recipe, w: number, h: number, pointer?: { x: number; y: number; vx: number; vy: number; hover: number }): Promise<Blob> };
```

Run: `npm test`
Expected: FAIL in the registry test (two ids missing) and the `usesPointer` test.

- [ ] **Step 2: Let `exportPng` take a pointer**

This is for tests and for anyone who wants a still of the hovered state. In `src/lib/exportPng.ts`:

- change the import to `import { createRenderer, type Pointer } from "../engine/renderer";`
- change the signature to `export async function exportPng(recipe: Recipe, width: number, height: number, pointer?: Pointer): Promise<Blob> {`
- change `renderer.render(recipe, 0);` to `renderer.render(recipe, 0, pointer);`

The studio's Export button calls it with three arguments, so exports stay at rest.

- [ ] **Step 3: Create the liquid push layer**

`src/layers/cursor-push.ts`:

```ts
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
```

This effect has no memory: it "settles back" only because `uHover` eases to zero. A ripple that keeps wobbling after the cursor leaves needs a buffer that persists between frames, which this plan leaves out.

- [ ] **Step 4: Create the spotlight layer**

`src/layers/cursor-light.ts`:

```ts
import { colorUniforms, type LayerDef } from "./types";

export const cursorLight: LayerDef = {
  id: "cursor-light",
  kind: "cursor",
  label: "Spotlight",
  interactive: () => true,
  defaults: { colors: ["#ffffff"], strength: 0.35, radius: 0.35 },
  controls: [
    { key: "colors", label: "Light colour", type: "color-list", min: 1, max: 1 },
    { key: "strength", label: "Brightness", type: "range", min: 0, max: 1, step: 0.01 },
    { key: "radius", label: "Size", type: "range", min: 0.05, max: 1, step: 0.01 },
  ],
  uniforms: (p) => ({ ...colorUniforms(p.colors as string[]), uStrength: p.strength as number, uRadius: p.radius as number }),
  fragment: `
uniform float uStrength, uRadius;
vec4 layer(vec2 uv) {
  vec3 c = texture(uPrev, uv).rgb;
  vec2 d = (uv - uPointer) * vec2(uRes.x / uRes.y, 1.0);
  float fall = exp(-dot(d, d) / (uRadius * uRadius));
  // screen blend: lifts dark areas a lot and bright areas a little, so it never clips to flat white.
  // Written as "c plus something" so that with no cursor it returns c exactly, bit for bit.
  return vec4(c + (1.0 - clamp(c, 0.0, 1.0)) * uColors[0] * uStrength * fall * uHover, 1.0);
}`,
};
```

The comment about "c plus something" is load-bearing. The first prototype used the textbook form `1 - (1 - c) * (1 - light)`, which is not bit-identical to `c` when light is zero, and it failed the no-change check.

- [ ] **Step 5: Add "Follow cursor" to the mesh**

In `src/layers/mesh.ts`:

- in `defaults`, after `motion: 1`, add `, follow: 0`
- in `controls`, after the `motion` row, add `{ key: "follow", label: "Follow cursor", type: "range", min: 0, max: 1, step: 0.01 },`
- in `uniforms`, after `uMotion: p.motion as number`, add `, uFollow: p.follow as number`, and after the `uniforms` line add `interactive: (p) => (p.follow as number) > 0,`
- change `uniform float uSharpness, uSpread, uMotion;` to `uniform float uSharpness, uSpread, uMotion, uFollow;`
- in the loop, directly above `vec2 d = (uv - c) * asp;`, add:

```glsl
    // the nearest blobs lean toward the cursor (never all the way, or they would pile up on it); far ones barely move
    vec2 pull = (uPointer - c) * asp;
    c += (uPointer - c) * uFollow * uHover * 0.45 * exp(-dot(pull, pull) * 2.0);
```

- [ ] **Step 6: Add "Follow cursor" to the aura glow**

In `src/layers/radial.ts`:

- in `defaults`, after `falloff: 1`, add `, follow: 0`
- in `controls`, after the `falloff` row, add `{ key: "follow", label: "Follow cursor", type: "range", min: 0, max: 1, step: 0.01 },`
- in `uniforms`, after `uFalloff: p.falloff as number,`, add `uFollow: p.follow as number,`, and after the closing `}),` of `uniforms` add `interactive: (p) => (p.follow as number) > 0,`
- change `uniform float uRadius, uStretch, uFalloff;` to `uniform float uRadius, uStretch, uFalloff, uFollow;`
- replace `vec2 p = (uv - uCenter) * vec2(uRes.x / uRes.y / uStretch, 1.0);` with:

```glsl
  vec2 centre = uCenter + (uPointer - uCenter) * uFollow * uHover * 0.5;
  vec2 p = (uv - centre) * vec2(uRes.x / uRes.y / uStretch, 1.0);
```

Existing recipes have no `follow` value; `cleanRecipe` fills in the default of 0, so they render as before.

- [ ] **Step 7: Register the layers and add two presets**

In `src/layers/index.ts`, import `cursorLight` from `./cursor-light` and `cursorPush` from `./cursor-push`, and append `cursorPush, cursorLight` to the end of `allLayers`.

In `src/lib/presets.ts`, append inside `PRESETS`:

```ts
  make("Liquid Touch", 3, [layer("mesh", { follow: 0.7 }), layer("warp", { amount: 0.12 }), layer("cursor-push"), layer("grain", { amount: 0.08 })]),
  make("Spot Lit", 1, [layer("linear", { colors: ["#e6f1ff", "#3a74ff", "#0a1f8a", "#03061c", "#000000", "#000000"], bend: 0.5, spread: 0.9 }), layer("cursor-light"), layer("grain", { amount: 0.08 })]),
```

These are the only two presets with cursor effects. Do not add `follow` or cursor layers to any other preset.

- [ ] **Step 8: Run everything**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm test` — Expected: PASS.
Run: `npm run e2e` — Expected: PASS, two more tests than before. If "with no cursor, cursor effects change nothing" fails, an effect is not an exact no-op at `uHover` 0: find the term that is not multiplied by `uHover` and fix the formula. Do not loosen the test.

- [ ] **Step 9: Commit**

```bash
git add src e2e && git commit -m "Add cursor effects: liquid push, spotlight, and follow on mesh and aura"
```

---

### Task 3: The element tracks the cursor

Nothing in this task has been run. Expect to debug it against its tests.

**Files:**
- Modify: `src/embed/gradient-f.ts`
- Test: `e2e/cursor.spec.ts` (new)

**Interfaces:**
- Consumes: `Pointer`, `REST`, `Renderer.render(recipe, timeMs, pointer?)` from Task 1; `usesPointer` from Task 1; the `cursor-light` layer from Task 2.
- Produces: `<gradient-f>` reacts to the cursor when its recipe uses it. No new attributes or events.

- [ ] **Step 1: Write the failing browser tests**

`e2e/cursor.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import { encodeRecipe, layer, type Recipe } from "../src/lib/recipe";

const recipeOf = (...layers: Recipe["layers"]): Recipe => ({ v: 1, seed: 1, frame: 0, speed: 0, layers });
const LIT = encodeRecipe(recipeOf(layer("linear", { colors: ["#000000", "#101030"] }), layer("cursor-light", { strength: 1, radius: 0.5 })));
const PLAIN = encodeRecipe(recipeOf(layer("linear", { colors: ["#000000", "#101030"] })));

/** A page with one 400x300 gradient at the top left, an overlaid button, and room to scroll. */
async function mount(page: Page, recipe: string) {
  await page.goto("/");
  await page.addScriptTag({ url: "/embed.js", type: "module" });
  await page.evaluate((recipe) => {
    document.body.innerHTML = `
      <div style="position:relative;width:400px;height:300px">
        <gradient-f id="g" recipe="${recipe}" style="display:block;width:400px;height:300px"></gradient-f>
        <button style="position:absolute;left:100px;top:100px;width:200px;height:100px">On top</button>
      </div>
      <div style="height:3000px"></div>`;
    document.body.style.margin = "0";
  }, recipe);
  await page.waitForTimeout(400);
}
const shot = (page: Page) => page.locator("#g").screenshot();
const settle = (page: Page) => page.waitForTimeout(1500); // the fade-out settles in about 1.2 s

test("cursor effect works under overlaid content", async ({ page }) => {
  await mount(page, LIT);
  await page.mouse.move(700, 500); // outside
  await settle(page);
  const rest = await shot(page);
  await page.mouse.move(200, 150); // over the button that sits on the gradient
  await settle(page);
  expect((await shot(page)).equals(rest)).toBe(false);
});

test("effect fades and the loop stops when the cursor leaves", async ({ page }) => {
  await mount(page, LIT);
  await page.mouse.move(700, 500);
  await settle(page);
  const rest = await shot(page);
  await page.mouse.move(50, 50);
  await settle(page);
  const lit = await shot(page);
  expect(lit.equals(rest)).toBe(false);
  // scrolling moves the gradient under a still cursor: the light must move with the cursor, not stay put
  await page.mouse.wheel(0, 20);
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(700, 500);
  await settle(page);
  expect((await shot(page)).equals(rest)).toBe(true);
  // settled and static: no more frames are requested
  const frames = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        const original = window.requestAnimationFrame;
        window.requestAnimationFrame = (cb) => (n++, original(cb));
        setTimeout(() => ((window.requestAnimationFrame = original), resolve(n)), 500);
      }),
  );
  expect(frames).toBe(0);
});

test("reduced motion turns cursor effects off", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await mount(page, LIT);
  await page.mouse.move(700, 500);
  await settle(page);
  const rest = await shot(page);
  await page.mouse.move(200, 150);
  await settle(page);
  expect((await shot(page)).equals(rest)).toBe(true);
  await context.close();
});

test("listeners follow the recipe", async ({ page }) => {
  await mount(page, PLAIN);
  const moves = () =>
    page.evaluate(() => {
      // count pointermove listeners added to window from now on
      const w = window as unknown as { __moves?: number };
      return w.__moves ?? 0;
    });
  await page.evaluate(() => {
    const w = window as unknown as { __moves: number };
    w.__moves = 0;
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, ...rest: unknown[]) => (type === "pointermove" && w.__moves++, (add as (...a: unknown[]) => void)(type, ...rest))) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, ...rest: unknown[]) => (type === "pointermove" && w.__moves--, (remove as (...a: unknown[]) => void)(type, ...rest))) as typeof window.removeEventListener;
  });
  expect(await moves()).toBe(0); // plain recipe: nothing listening
  await page.evaluate((r) => document.getElementById("g")!.setAttribute("recipe", r), LIT);
  expect(await moves()).toBe(1);
  await page.evaluate((r) => document.getElementById("g")!.setAttribute("recipe", r), PLAIN);
  expect(await moves()).toBe(0);
  await page.evaluate((r) => document.getElementById("g")!.setAttribute("recipe", r), LIT);
  await page.evaluate(() => document.getElementById("g")!.remove());
  expect(await moves()).toBe(0);
});
```

Run: `npm run e2e -- e2e/cursor.spec.ts`
Expected: FAIL. The first two tests fail because the screenshot does not change; "listeners follow the recipe" fails at the first `toBe(1)`.

- [ ] **Step 2: Add the tracking state and listeners**

In `src/embed/gradient-f.ts`:

Change the renderer import to `import { createRenderer, REST, type Pointer, type Renderer } from "../engine/renderer";` and add `import { usesPointer } from "../layers";`.

Add these fields to the class, after `#visible`:

```ts
    // raw cursor in viewport pixels (null = away), the smoothed state the shaders see, and the last frame time
    #client: { x: number; y: number } | null = null;
    #pointer: Pointer = { ...REST };
    #lastFrame = 0;
    #tracking = false;
    // The handlers only store or clear the position; all maths happens once per frame in #stepPointer.
    #onMove = (e: PointerEvent) => {
      this.#client = { x: e.clientX, y: e.clientY };
      this.#schedule();
    };
    #onGone = () => {
      this.#client = null;
      this.#schedule();
    };
    // a finger lifting ends the hover; a mouse button releasing does not
    #onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") this.#onGone();
    };
    #onScroll = () => this.#schedule();
```

Add this method:

```ts
    /** Listen for the cursor only while this gradient uses it. On `window`, because text and buttons often sit on top of a gradient and would swallow events aimed at the element. */
    #track(on: boolean) {
      on &&= !matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (on === this.#tracking) return;
      this.#tracking = on;
      const act = on ? "addEventListener" : "removeEventListener";
      window[act]("pointermove", this.#onMove as EventListener, { passive: true });
      window[act]("pointerup", this.#onUp as EventListener, { passive: true });
      window[act]("pointercancel", this.#onGone);
      window[act]("blur", this.#onGone);
      window[act]("scroll", this.#onScroll, { passive: true, capture: true });
      document.documentElement[act]("pointerleave", this.#onGone);
      if (!on) {
        this.#client = null;
        this.#pointer = { ...REST };
      }
    }
```

Call it in three places:

- at the end of `connectedCallback`: `this.#track(usesPointer(this.#recipe));`
- in `attributeChangedCallback`, after `this.#recipe = decodeRecipe(value);`: `if (this.#canvas) this.#track(usesPointer(this.#recipe));`
- at the start of `disconnectedCallback`: `this.#track(false);`

- [ ] **Step 3: Smooth the cursor and drive the loop**

Add this method:

```ts
    /** Advance the smoothed cursor by `dt` seconds. Returns true while it is still moving or fading. */
    #stepPointer(dt: number): boolean {
      const p = this.#pointer;
      const rect = this.getBoundingClientRect();
      const c = this.#client;
      const inside = !!c && rect.width > 0 && rect.height > 0 && c.x >= rect.left && c.x <= rect.right && c.y >= rect.top && c.y <= rect.bottom;
      const ease = (seconds: number) => 1 - Math.exp(-dt / seconds);
      let gap = 0;
      if (inside && c) {
        const tx = (c.x - rect.left) / rect.width;
        const ty = 1 - (c.y - rect.top) / rect.height;
        // arriving from rest: start at the cursor, so the effect does not sweep in from where it last was
        if (p.hover < 0.01) {
          p.x = tx;
          p.y = ty;
          p.vx = p.vy = 0;
        }
        const nx = p.x + (tx - p.x) * ease(0.12);
        const ny = p.y + (ty - p.y) * ease(0.12);
        if (dt > 0) {
          const clamp = (v: number) => Math.max(-3, Math.min(3, v));
          p.vx += (clamp((nx - p.x) / dt) - p.vx) * ease(0.1);
          p.vy += (clamp((ny - p.y) / dt) - p.vy) * ease(0.1);
        }
        p.x = nx;
        p.y = ny;
        gap = Math.hypot(tx - p.x, ty - p.y);
      } else {
        // keep the last position while fading out; only the velocity and strength decay
        p.vx -= p.vx * ease(0.1);
        p.vy -= p.vy * ease(0.1);
      }
      const target = inside ? 1 : 0;
      p.hover += (target - p.hover) * ease(inside ? 0.2 : 0.25);
      const settled = Math.abs(target - p.hover) < 0.01 && Math.hypot(p.vx, p.vy) < 0.002 && gap < 0.0005;
      if (settled) {
        // land exactly, so a settled frame at rest is bit-identical to one with no cursor effect
        p.hover = target;
        p.vx = p.vy = 0;
      }
      return !settled;
    }
```

Replace the body of `#draw` with:

```ts
    #draw(now: number) {
      const renderer = this.#renderer;
      if (!renderer) return;
      this.#start ||= now;
      const animate = this.#recipe.speed !== 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      // the first frame after a pause has no previous time: treat it as an instant
      const dt = this.#lastFrame ? Math.min(0.1, (now - this.#lastFrame) / 1000) : 0;
      this.#lastFrame = now;
      const moving = this.#tracking && this.#stepPointer(dt);
      renderer.render(this.#recipe, animate ? now - this.#start : 0, this.#tracking ? this.#pointer : undefined);
      if (animate || moving) this.#schedule();
      else this.#lastFrame = 0;
    }
```

- [ ] **Step 4: Run the cursor tests**

Run: `npm run e2e -- e2e/cursor.spec.ts`
Expected: PASS, 4 tests.

Likely failures and where to look:

- *Screenshot never changes:* check `#track(true)` actually ran (`usesPointer` true, reduced motion false), and that `#draw` passes `this.#pointer`.
- *Does not return to the resting image:* `p.hover` is not landing on exactly 0; check the `settled` branch.
- *Frames keep being requested:* `#stepPointer` keeps returning true; log `p.hover`, the velocity and `gap`.
- *`pointerleave` on the document element does not fire in headless Chromium:* the `blur` and "cursor outside the element's rectangle" paths already cover the test; keep the listener for real browsers.

- [ ] **Step 5: Run the full suites**

Run: `npm test` — Expected: PASS.
Run: `npm run e2e` — Expected: PASS, four more tests than after Task 2. "embed survives abuse" must still pass: it reconnects the element and changes the attribute, which exercises `#track`.

- [ ] **Step 6: Commit**

```bash
git add src e2e && git commit -m "gradient-f: track and smooth the cursor for recipes that use it"
```

---

### Task 4: Show it on the hero, and document it

**Files:**
- Modify: `src/app/page.tsx` (the `HERO` constant), `CLAUDE.md`, `DESIGN.md`, `docs/LAYERS.md`, `docs/HANDOFF.md`

**Interfaces:**
- Consumes: the `follow` param and `cursor-push` layer from Task 2.
- Produces: nothing for later tasks.

- [ ] **Step 1: Make the hero react**

In `src/app/page.tsx`, `HERO` is currently a moving copy of one preset. Replace its definition with a recipe that keeps the same look and adds the two gentlest effects. Add `layer` to the import from `@/lib/recipe`.

```ts
// Violet Dusk, moving, and the one place on the site that reacts to the cursor without being asked
const HERO = {
  ...PRESETS[3].recipe,
  speed: 1,
  layers: [{ ...PRESETS[3].recipe.layers[0], params: { ...PRESETS[3].recipe.layers[0].params, follow: 0.6 } }, layer("cursor-push", { strength: 0.05 }), ...PRESETS[3].recipe.layers.slice(1)],
};
```

`PRESETS[3]` must still be "Violet Dusk" (a mesh, then grain). If the preset order has changed, find it by name instead: `PRESETS.find((p) => p.name === "Violet Dusk")!`.

- [ ] **Step 2: Look at it**

Run: `npm run dev`. Open `http://localhost:3000`.

- Move the cursor across the hero, including over the headline and the two buttons: the colour areas lean toward the cursor and the image bulges gently under it.
- Move the cursor off the hero: it settles back within about a second.
- Open "Liquid Touch" and "Spot Lit" from the gallery: the studio preview reacts. Open any other preset: it does not.
- In the studio, the add-layer menu has a "Cursor effects" group with "Liquid push" and "Spotlight"; Mesh blur and Aura glow each have a "Follow cursor" slider at 0.
- Export a PNG from "Spot Lit" with the cursor over the preview: the file has no spotlight.

- [ ] **Step 3: Update the docs**

- `CLAUDE.md`, Architecture: add one paragraph naming the three pointer uniforms, `LayerDef.interactive`, `usesPointer`, where tracking lives (`src/embed/gradient-f.ts`), and the rule that with no cursor every effect is an exact no-op.
- `DESIGN.md`, Rules: add "Cursor effects belong to a gradient's recipe. The site's own chrome still has no hover colour."
- `docs/LAYERS.md`: add `cursor` to the kinds table ("Reacts to the cursor; reads `uPrev`"), the three uniforms to "What the shader gets", the two layers and the `follow` control to "The layers that exist", and to Rules: "A cursor effect must return its input exactly when `uHover` is 0. Write it as input plus a term multiplied by `uHover`."
- `docs/HANDOFF.md`: add the feature to the update section, with the limits listed below.

- [ ] **Step 4: Final check and commit**

Run: `npm test`, `npm run e2e`, `npm run build` — Expected: all pass.

```bash
git add -A && git commit -m "Hero reacts to the cursor; document cursor effects"
```

---

## Limits to state when this ships

- **Touch:** phones have no hover. The effect shows only while a finger is down on the gradient, and ends when the finger lifts or the page scrolls.
- **Iframes:** a gradient inside an iframe cannot see the cursor outside the frame; the effect fades at the frame's edge.
- **Layer limit:** the two cursor layers count toward the six-layer maximum. "Follow cursor" does not, since it is a setting on an existing layer.
- **PNG export** never includes cursor effects.
- **Thumbnails** never react.

## Deliberately left out

- An attribute to switch cursor effects off for one embed (`<gradient-f>` has only `recipe`). Add it when someone needs a recipe's look without its interaction.
- Hover on gallery cards.
- A ripple that keeps moving after the cursor leaves (needs a buffer that persists between frames).
- Cursor trail.
- "Follow cursor" on base layers other than mesh and aura.

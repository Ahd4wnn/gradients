# Gradient Studio — design spec (sub-project 1 of 3)

Date: 2026-11-12 (replaces the 2026-11-11 version built on Paper Shaders)

## Goal

A public website where designers and developers create gradients good enough
to pay for: every major gradient type, freely combined, exported as PNG up to
4K or as live code. The bar is "looks hand-made by a designer", not generic
generator output.

Inspirations: grainient.supply, backgrounds.supply, ditther.com, pryzm.design,
and a Pinterest survey (nine searches, about 230 pins) that produced the type
catalogue below.

## The three sub-projects

1. **Studio** (this spec): layered shader engine, live editor, gallery,
   export, share links, embed runtime.
2. **MCP server** (own spec): agents create and fetch gradients; returns the
   recipe, a studio link and embed code. No server-side image rendering.
3. **Accounts and Pro plan** (own spec): sign-in, saved gradients, billing,
   free vs Pro limits.

Sub-projects 2 and 3 depend only on the recipe format and the pure functions
in `lib/recipe.ts` and `lib/embed.ts`.

## Decisions

- **Own shader engine.** The Pinterest survey showed the strongest gradients
  are combinations (a colour field, distorted, behind glass, with texture on
  top). Paper Shaders cannot stack effects and covers about 8 of the 25 types,
  so it is dropped.
- **Raw WebGL2**, no three.js or other rendering dependency. The engine only
  draws full-screen quads.
- **Stack:** Next.js (App Router) + TypeScript + Tailwind, on Vercel.
- **No database** in this sub-project. A gradient lives entirely in its URL.
- **Rejected:** raea (local GPU video/game renderer, FSL licence, no browser
  runtime).

## Type catalogue and delivery waves

Each type is one **layer** in the engine. A layer has a kind that fixes where
it normally sits in the stack: `base` → `distort` → `surface` → `texture`.

| # | Type | Kind | Wave |
|---|---|---|---|
| 1 | Horizon fade (linear) | base | 1 |
| 2 | Aura / orb glow (radial) | base | 1 |
| 3 | Mesh blur | base | 1 |
| 5 | Pastel wash | preset of 3 | 1 |
| 6 | Liquid swirl (warp) | distort | 1 |
| 10 | Grain | texture | 1 |
| 11 | Halftone dots | texture | 1 |
| 12 | Dither / pixel | texture | 1 |
| 14 | Fluted / ribbed glass | surface | 1 |
| 4 | Blurred shapes | base | 2 |
| 7 | Wave ribbons | distort | 2 |
| 8 | Melt / zigzag stretch | distort | 2 |
| 9 | Thermal contour | surface | 2 |
| 13 | Line screen | texture | 2 |
| 15 | Frosted glass | surface | 2 |
| 16 | Fractal / tiled glass | surface | 2 |
| 22 | Gradient bars | base | 2 |
| 23 | Rings and arcs | base | 2 |
| 24 | Layered waves | base | 2 |
| 25 | Retro stripes and sunbursts | base | 2 |
| 17 | Light leaks and prism streaks | base | 3 |
| 18 | Light beams | base | 3 |
| 19 | Holographic foil | surface | 3 |
| 20 | Liquid chrome | surface | 3 |
| 21 | Satin folds | surface | 3 |

**This spec's implementation scope is the engine, the studio, and all 25
types.** The wave column is build order only: wave 1 proves the engine and
studio end to end, then waves 2 and 3 add the remaining layers (one registry
entry and one shader each). Nothing ships to the public until all three waves
are in and every type has at least one approved preset. Liquid chrome is a
shader approximation and will not match 3D-rendered references.

## The recipe

```ts
type Recipe = {
  v: 1;
  seed: number;          // drives all randomness; same seed = same image
  frame: number;         // animation time, ms; fixed for stills
  speed: number;         // 0 = static
  layers: Layer[];       // 1 to 6, drawn in order
};
type Layer = {
  type: LayerId;         // e.g. "mesh", "warp", "fluted-glass", "grain"
  params: Record<string, number | string | boolean | string[]>;
};
```

Stacking is free: any layer may follow any other, up to six. A non-base layer
placed first receives black as its input.

## Engine

- **Multi-pass:** two framebuffers, ping-ponged. Each layer is one fragment
  shader reading the previous pass as `uPrev` and writing the next. Base
  layers ignore `uPrev`. The last pass draws to the canvas.
- **Layer contract:** every layer module exports
  `{ id, kind, label, fragment, defaults, controls, uniforms(params) }`.
  `controls` is a list of `{ key, label, type: "color-list" | "range" |
  "select" | "toggle", min, max, step, options }`; the studio UI is generated
  from it. `layers/index.ts` is the registry.
- **Shared GLSL** (`engine/glsl/common.ts`, prepended to every shader):
  seeded hash and simplex noise, sRGB ↔ OKLab conversion, palette sampling.

### Quality rules (what separates this from generic output)

1. **Colours are mixed in OKLab**, never raw sRGB, so blends stay vivid
   instead of passing through grey or mud.
2. **Framebuffers are 16-bit float** (`RGBA16F`); the final pass adds
   sub-pixel noise before quantising to 8-bit. This removes banding in smooth
   and dark gradients, the most visible flaw of cheap generators.
3. **Resolution independence:** every size-like param (grain size, dot pitch,
   flute width, warp scale) is expressed relative to image height. A 4K export
   is the same picture as the preview, not a finer-grained one.
4. **Grain has two modes:** uniform film grain, and edge grain that is strong
   only where colour is changing.
5. **Presets are hand-tuned against the Pinterest references** and each is
   approved by the product owner before it ships. No auto-generated presets.

## Units

| Unit | Does | Depends on |
|---|---|---|
| `engine/renderer.ts` | `createRenderer(canvas)` → `{ render(recipe, timeMs), resize(w, h), dispose() }`; compiles and caches layer programs, runs the passes | WebGL2, `layers` |
| `engine/glsl/common.ts` | Shared noise, colour and palette functions, as a GLSL string (no bundler loader needed) | — |
| `layers/*.ts` | One file per layer: shader, defaults, controls | `common.glsl` |
| `layers/index.ts` | Registry of layers by id | `layers/*` |
| `lib/recipe.ts` | `encodeRecipe`, `decodeRecipe` (validates and clamps every param against the registry; unknown layers are dropped; bad input returns the default recipe), `randomRecipe()` | registry metadata only |
| `lib/embed.ts` | `toHtml(recipe)`, `toReact(recipe)` → snippet strings | `recipe` |
| `lib/exportPng.ts` | `exportPng(recipe, w, h) → Blob` | `renderer` |
| `embed/gradient-f.ts` | `<gradient-f recipe="…">` custom element; built to one file served at `/embed.js` | `renderer` |
| `components/GradientCanvas` | Renders a recipe live | `renderer` |
| `components/LayerStack` | Add, remove, reorder, toggle layers | registry |
| `components/Controls` | Generated controls for the selected layer | registry |
| `app/page.tsx` | Gallery | `GradientCanvas` |
| `app/studio/page.tsx` | Studio | all of the above |

`lib/recipe.ts` and `lib/embed.ts` have no browser or WebGL dependency, so the
MCP server reuses them unchanged. Layer metadata (defaults, controls) is kept
importable without the shader source for that reason.

## Data flow

1. `/studio?g=<encoded>` loads; `decodeRecipe` yields the recipe or the default.
2. Edits update React state; `GradientCanvas` calls `render` on each animation
   frame while `speed ≠ 0`, otherwise once per change.
3. The URL is updated with `history.replaceState` (debounced) so the address
   bar is always the share link.
4. Encoding: `JSON.stringify` → base64url. No compression.

## Screens

- **Gallery (`/`)**: about 50 approved presets (at least one per type, the
  rest combinations) as still thumbnails, each linking to `/studio?g=…`.
  Presets are a static array of recipes in the repo. Thumbnails are drawn by
  one shared renderer and copied to 2D canvases, because browsers allow only
  about 16 live WebGL canvases per page. The studio canvas is live.
- **Studio (`/studio`)**: canvas on the left. On the right: the layer stack
  (add from a menu grouped by kind, drag or arrow-key reorder, hide, delete),
  the selected layer's controls, Randomise, Copy link, Export PNG, Copy code.
  On narrow screens the panel stacks below the canvas.

Controls are native inputs with labels and are fully keyboard-operable.
`prefers-reduced-motion` forces `speed` to 0.

## Export

- **PNG:** a detached canvas at the target pixel size renders the recipe once
  at its `frame` and is read with `canvas.toBlob`. Sizes: 1280×720, 1920×1080,
  2560×1440, 3840×2160, plus 1:1 and 9:16 at matching heights. All sizes are
  open in this sub-project; Pro gating arrives in sub-project 3.
- **Code:** one runtime for every framework. `toHtml` emits
  `<script type="module" src="https://<site>/embed.js"></script>` and
  `<gradient-f recipe="…" style="…"></gradient-f>`. `toReact` emits the same
  element as JSX plus the script import. No npm package in this sub-project.

## Error handling

- WebGL2 or float render targets unavailable, or context lost: the canvas
  shows a CSS gradient built from the first layer's colours with a short
  message. Controls stay usable; context restore re-creates the renderer.
- Shader compile failure: logged with the layer id; that layer is skipped and
  the rest of the stack still renders.
- PNG export larger than the GPU allows (`MAX_TEXTURE_SIZE`) or `toBlob`
  failure: show the error and name the largest size that will work. No silent
  downscale.
- Invalid `g` parameter: default recipe, no error page.
- The embed element applies the same fallbacks and never throws into the host
  page.

## Testing

- **Unit (Vitest):** recipe round-trip for every preset; hostile and malformed
  input returns a valid, clamped recipe; every control key exists in its
  layer's defaults and every default lies inside its control's range; embed
  snippets contain the encoded recipe.
- **Render (Playwright, headless Chromium with WebGL):** every layer compiles;
  each preset renders non-blank; the same recipe and seed renders pixel-equal
  twice; a 3840×2160 export has those dimensions; a smooth dark gradient has
  no run of identical pixel rows longer than a set threshold (banding check).
- **Manual:** each preset reviewed side by side with its Pinterest reference.

## Out of scope

Video export, photo upload, node-graph editing, AI
generation, saved gradients, accounts, payments, the MCP server, an npm
package.

## Open risks

- `RGBA16F` render targets need the `EXT_color_buffer_float` extension. It is
  near-universal on desktop but must be probed; without it the engine falls
  back to 8-bit targets and banding protection is weaker.
- Six float passes at 4K may be slow or fail on integrated GPUs. The first
  implementation task is a spike that proves a three-layer 4K export.
- "Best looking" is a judgment call. The preset approval step is the only real
  guard; the engine alone does not guarantee it.

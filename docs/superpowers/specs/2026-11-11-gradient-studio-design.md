# Gradient Studio — design spec (sub-project 1 of 3)

Date: 2026-11-11

## Goal

A public website where designers and developers create high-quality gradients
(mesh, grain, dither, glass, light rays) for app and website design, export them
as PNG or as live code, and share them by link.

Inspirations: grainient.supply, backgrounds.supply, ditther.com, pryzm.design.

## The three sub-projects

1. **Studio** (this spec): live editor, gallery, export, share links.
2. **MCP server** (own spec): agents create and fetch gradients; returns the
   recipe, a studio link and embed code. No server-side image rendering.
3. **Accounts and Pro plan** (own spec): sign-in, saved gradients, billing,
   free vs Pro limits.

Sub-projects 2 and 3 depend only on the recipe format and the two pure
functions defined below.

## Decisions

- **Rendering:** `@paper-design/shaders-react` (Apache-2.0, v0.0.82 at time of
  writing). We do not write our own shaders. Pin the exact version: it is
  pre-1.0 and its props may change.
- **Stack:** Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.
- **No database** in this sub-project. A gradient lives entirely in its URL.
- **Rejected:** raea (local GPU video/game renderer, FSL licence, no browser
  runtime); an own shader pipeline (weeks of work; revisit only if the
  library's looks prove too limiting for a paid product).

## The recipe

One small JSON object is the single source of truth for a gradient:

```ts
type Recipe = {
  v: 1;                 // format version
  style: StyleId;       // e.g. "mesh-gradient"
  params: Record<string, number | string | boolean | string[]>; // that style's props, colours included
  frame: number;        // animation time offset, so stills are deterministic
  speed: number;        // 0 = static
};
```

`params` holds exactly the props the Paper Shaders component for that style
accepts. We keep its names and value forms and do not translate them.

### Styles in v1

Eight styles, chosen to cover the inspirations:

| StyleId | Paper Shaders component | Covers |
|---|---|---|
| `mesh-gradient` | MeshGradient | smooth mesh/blur gradients |
| `grain-gradient` | GrainGradient | grainy gradients |
| `static-mesh-gradient` | StaticMeshGradient | mesh with grain, no animation |
| `static-radial-gradient` | StaticRadialGradient | soft radial washes |
| `dithering` | Dithering | dither art |
| `god-rays` | GodRays | light rays |
| `warp` | Warp | flowing colour bands |
| `neuro-noise` | NeuroNoise | abstract dark-mode textures |

Each style is one entry in a `styles` registry: its component, its default
params, and a list of controls (`{ key, label, type: "color-list" | "range" |
"select" | "toggle", min, max, step, options }`). The studio UI is generated
from this list; adding a style means adding one registry entry.

Image-filter shaders (fluted glass, paper texture, halftone) need an uploaded
image and are out of scope.

## Units

| Unit | Does | Depends on |
|---|---|---|
| `lib/styles.ts` | Style registry: component, defaults, controls | Paper Shaders |
| `lib/recipe.ts` | `encodeRecipe(recipe) → string`, `decodeRecipe(string) → Recipe` (validates; unknown style or bad params fall back to that style's defaults, bad string falls back to the default recipe), `randomRecipe(style)` | `styles` |
| `lib/embed.ts` | `toReact(recipe) → string`, `toHtml(recipe) → string` | `styles` |
| `lib/exportPng.ts` | `exportPng(recipe, width, height) → Blob` | Paper Shaders |
| `components/GradientCanvas` | Renders a recipe live | `styles` |
| `components/Controls` | Renders a style's controls, emits param changes | `styles` |
| `app/page.tsx` | Gallery of presets | `GradientCanvas` |
| `app/studio/page.tsx` | Studio | all of the above |

`lib/recipe.ts` and `lib/embed.ts` are pure and have no browser dependency, so
the MCP server reuses them unchanged.

## Data flow

1. `/studio?g=<encoded>` loads; `decodeRecipe` produces the recipe (or the
   default).
2. Controls change the recipe in React state; `GradientCanvas` re-renders.
3. The URL is updated with `history.replaceState` (debounced) so the address
   bar is always the share link.
4. Encoding: `JSON.stringify` → base64url. Recipes are small (well under 1 KB),
   so no compression.

## Screens

- **Gallery (`/`)**: grid of about 24 hand-tuned presets (three per style),
  each a live canvas linking to `/studio?g=…`. Presets are a static array of
  recipes in the repo.
- **Studio (`/studio`)**: canvas on the left; on the right a style picker, the
  generated controls, Randomise, Copy link, Export PNG (size picker), Copy code
  (React / HTML tabs). On narrow screens the controls stack below the canvas.

Controls are native inputs (`<input type="range">`, `<input type="color">`,
`<select>`) with labels, fully keyboard-operable. Animation respects
`prefers-reduced-motion` (speed forced to 0).

## Export

- **PNG:** mount the style's shader in a detached, fixed-size container at the
  target pixel size with `speed: 0`, the recipe's `frame`,
  `preserveDrawingBuffer: true`, and `maxPixelCount` raised to the target
  area; read it with `canvas.toBlob`. Sizes: 1280×720, 1920×1080, 2560×1440,
  3840×2160, plus 1:1 and 9:16 variants. All sizes are available in this
  sub-project; Pro gating arrives in sub-project 3.
- **Code:** `toReact` emits an import and one JSX element with the recipe's
  params as props. `toHtml` emits a `<script type="module">` using the vanilla
  `@paper-design/shaders` package from a CDN.

## Error handling

- WebGL2 unavailable or context lost: the canvas shows a static CSS gradient
  built from the recipe's colours and a short message; controls stay usable.
- PNG export failure (GPU limit at large sizes): show the error and suggest
  the next size down. No silent fallback to a smaller image.
- Invalid `g` parameter: load the default recipe; no error page.

## Testing

- Unit (Vitest): `decodeRecipe(encodeRecipe(r))` equals `r` for every preset;
  malformed and hostile input returns a valid recipe; `toReact`/`toHtml`
  output contains every param of the recipe; every registry control key exists
  in that style's defaults.
- Manual in the browser: each style renders, each control changes the canvas,
  a share link reproduces the same image, PNG export at 4K has the requested
  pixel dimensions.

## Out of scope

Video export, photo upload and image filters, effect stacking or node graphs,
AI generation, saved gradients, accounts, payments, the MCP server.

## Open risks

- 4K PNG export is designed from the library's type definitions
  (`maxPixelCount`, `frame`, `webGlContextAttributes`) and has not been run.
  It is the first thing to prove during implementation.
- The exact prop names per style are taken from the library at the pinned
  version when the registry is written; they are not listed here.

# Writing a gradient layer

A gradient is a stack of up to six layers. Each layer is one file in `src/layers/` that exports a `LayerDef`: a fragment shader plus the metadata that generates its controls and validates its values. Adding a type to the product means adding one such file.

## The contract

```ts
// src/layers/types.ts
type LayerDef = {
  id: string;                 // kebab-case, stored in recipes: never rename once shipped
  kind: "base" | "distort" | "surface" | "recolor" | "texture";
  label: string;              // shown in the studio
  fragment: string;           // GLSL that defines `vec4 layer(vec2 uv)`
  defaults: Params;           // one entry per control, same keys
  controls: Control[];        // generates the UI and drives validation
  uniforms(p: Params): Record<string, number | number[]>;
  handles?(p, seed): Handle[];            // optional: draggable dots on the preview
  moveHandle?(p, seed, index, x, y): Params;
};
```

| Kind | Reads the layers below (`uPrev`)? | Examples |
|---|---|---|
| `base` | No. Paints a full image. | linear, radial, mesh |
| `distort` | Yes, at moved coordinates. | warp |
| `surface` | Yes, through glass or a material. | fluted-glass |
| `recolor` | Yes, same pixel, new colour. | none yet |
| `texture` | Yes, adds a print or film texture on top. | grain, halftone, dither |

`kind` only groups layers in the add-layer menu. Any layer may follow any other. A non-base layer placed first receives black.

## Controls

| `type` | Value in `params` | Fields |
|---|---|---|
| `range` | number | `min`, `max`, `step` |
| `select` | one of `options` (string) | `options` |
| `toggle` | boolean | — |
| `color-list` | array of `#rrggbb` | `min`, `max` (at most 6) |
| `points` | flat `[x0, y0, x1, y1, …]`, 0..1, y up | `max`; edited by dragging on the preview, not in the panel |

`cleanRecipe` in `src/lib/recipe.ts` validates every value against these on decode: numbers are clamped to the range, unknown options and malformed colours fall back to the default. So **the default must itself be valid**, and a range must be safe for the shader across its whole width.

## What the shader gets

`src/engine/glsl/common.ts` is prepended to every fragment. It declares:

| Name | Meaning |
|---|---|
| `uniform sampler2D uPrev` | Result of the layers below. Wrap mode is mirrored repeat, so sampling outside 0..1 is safe. |
| `uniform vec2 uRes` | Output size in pixels. |
| `uniform float uTime` | Seconds. Fixed for stills, advances when the recipe's `speed` is above 0. |
| `uniform float uSeed` | The recipe seed. |
| `uniform vec3 uColors[6]`, `uniform int uColorCount` | The layer's colour list, as sRGB 0..1. Filled by `colorUniforms()`. |
| `uniform float uOpacity`, `uniform int uBlend` | Per-layer compositing. Applied for you after `layer()` returns; do not use them. |
| `float hash21(vec2)` | Random 0..1, already offset by the seed. |
| `float gnoise(vec2)` | Gradient noise, about −0.7..0.7. |
| `float fbm(vec2, int octaves)` | Up to 4 octaves of `gnoise`. |
| `vec3 toOklab(vec3 srgb)`, `vec3 fromOklab(vec3)` | Colour space conversion. |
| `vec3 palette(float t)` | The colour list as evenly spaced stops, blended in OKLab; `t` in 0..1. |
| `float luma(vec3)` | Brightness of an sRGB colour. |

`src/layers/glsl.ts` has opt-in helpers; prepend the string to your fragment:

| Export | Gives you |
|---|---|
| `PICK` | `vec3 pick(float i)`: the i-th colour, cycling round the list (for hard bands). `vec3 mixOk(a, b, k)`: OKLab mix of two sRGB colours. |
| `VORO` | `vec3 voro(vec2 p, float t)`: cell noise; x = distance to nearest point, y = distance to the cell border, z = cell id. |

Uniforms you declare are set by name from what `uniforms()` returns: a `float` takes a number, an `int` takes a number, `vec2` and `vec3` take arrays. A name that does not match is silently left at 0, so a typo shows up as a control that does nothing.

## Rules

These come from the spec's quality rules. Breaking one is a bug even if the image looks fine at one size.

1. **Mix colours in OKLab.** Use `palette()`, `mixOk()`, or `toOklab`/`fromOklab`. A plain `mix()` of two sRGB colours goes grey in the middle.
2. **Sizes scale with image height, 1080 as the reference.** A dot spacing of `uPitch` means `uPitch * uRes.y / 1080.0` pixels. Things measured in UV units (a radius of 0.3) already scale. This is what makes a 4K export the same picture as the preview.
3. **Correct for aspect ratio.** For round shapes work in `(uv - c) * vec2(uRes.x / uRes.y, 1.0)`. When offsetting a sample, divide the x offset by the aspect ratio, as `warp` does.
4. **UV origin is bottom-left.** `uv.y = 1` is the top of the image.
5. **Seed all randomness.** Use `hash21`; never a constant pattern that ignores the seed, never `uTime` for a still's layout.
6. **A still must be stable.** At a fixed `uTime` the same recipe must render the same pixels every time. The browser tests check this for every preset.
7. **No undefined maths.** No `pow` of a negative, no division that can reach zero across the control's range, no `sqrt` of a negative. Clamp first.
8. **Return opaque colour.** `vec4(rgb, 1.0)`. Values slightly outside 0..1 are fine between layers; the final pass clamps.
9. **Antialias hard edges.** Use `smoothstep` over about one pixel (`1.0 / uRes.y` in UV units, or `fwidth`), not `step`.

## Checklist for a new layer

1. Create `src/layers/<id>.ts`. Copy the nearest existing layer of the same kind.
2. Add it to `allLayers` in `src/layers/index.ts`. The array order is the menu order.
3. Extend the expected id list in the registry test at the bottom of `src/layers/layers.test.ts`.
4. Add at least one preset that uses it in `src/lib/presets.ts` (a unit test fails if any layer has no preset).
5. Run `npm test`. The per-layer tests check defaults against controls and that `uniforms()` returns finite numbers.
6. Run `npm run e2e`. "every layer compiles and draws" compiles the shader in a real browser and checks the layer changes the image; "presets render, and render the same twice" checks stability.
7. Look at it: `npm run dev`, then `node scripts/render.mjs`, then open `out/presets/<name>.png`. Passing tests say the shader compiles, not that it is beautiful.

No other file needs to change: the studio builds its controls from `controls`, and the renderer finds the layer through the registry.

## The layers that exist

| id | Label | Kind | Controls |
|---|---|---|---|
| `linear` | Horizon fade | base | colours (2–6), angle, bend, spread. First colour is at the bottom when angle is 0. |
| `radial` | Aura glow | base | colours (2–6), centre x and y, radius, stretch, falloff. First colour is at the centre. |
| `mesh` | Mesh blur | base | colours (2–6), sharpness, spread, motion. One soft blob per colour, placed by the seed. |
| `warp` | Liquid swirl | distort | amount, scale, detail, flow speed. |
| `fluted-glass` | Fluted glass | surface | ridges, refraction, angle, shading. |
| `grain` | Grain | texture | amount, grain size, mode (film or edge), monochrome. |
| `halftone` | Halftone dots | texture | paper colour, dot spacing, screen angle, softness, light dots. |
| `dither` | Dither | texture | pixel size, colour levels, pattern (bayer4, bayer8, noise). |
| `holo-foil` | Holographic foil | surface | amount, scale, colour cycles, pastel, flow speed. |
| `chrome` | Liquid chrome | surface | scale, depth, reflections, rainbow edge, colour from below, flow speed. |
| `satin` | Satin folds | surface | folds, amount, twist, angle, flow speed. |
| `prism` | Prism streaks | surface | streaks, angle, width, length, rainbow, brightness. Adds light to what is below. |
| `beams` | Light beams | surface | light colours (1–3), source x and y, rays, reach, brightness, flow speed. Adds light. |
| `shapes` | Blurred shapes | base | colours (2–6, first is the background), shapes, size, blur, shape (circle, sparkle, ring), motion. |
| `rings` | Rings and arcs | base | colours (2–6), centre x and y, rings, fade, stretch. |
| `frosted-glass` | Frosted glass | surface | glass tint, blur, frost, milkiness. |
| `tiled-glass` | Tiled glass | surface | tiles, tile offset, lens, bevel, angle. |
| `ribbons` | Wave ribbons | distort | height, waves, twist, angle, flow speed. |
| `melt` | Melt | distort | amount, columns, jaggedness, angle, flow speed. |

Still to build, from the spec's catalogue:

No plan yet: thermal contour, line screen, gradient bars, layered waves, retro stripes and sunbursts.

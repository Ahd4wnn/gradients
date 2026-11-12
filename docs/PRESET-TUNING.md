# Tuning the gallery presets

The gallery is the product's shop window. The spec requires every preset to be hand-tuned against a reference look and approved by the owner; nothing auto-generated ships. The twelve presets in `src/lib/presets.ts` today are **untuned first drafts**.

The owner's bar, in their words: the best-looking gradients, not "AI slop", that people would pay for.

## The loop

1. Start the site: `npm run dev` (port 3000).
2. Render everything: `node scripts/render.mjs`. This writes `out/gallery.png` and one 1920×1080 PNG per preset in `out/presets/`.
3. **Look at the PNGs.** Open each file and judge it at 100%. An agent should read the image files, not reason from the numbers.
4. Change values in `src/lib/presets.ts`.
5. Render again and compare. Repeat until it matches its target below.
6. Run `npm test` and `npm run e2e`.
7. Show the owner `out/gallery.png` and the individual PNGs. For each preset the owner says keep, change, or cut. Apply, re-run step 6, commit.

To try an idea quickly, open the preset in the studio, move the controls, then copy the address bar. The part after `?g=` is the whole recipe. Decode it to read the values:

```bash
node -e "console.log(JSON.stringify(JSON.parse(atob(process.argv[1].replace(/-/g,'+').replace(/_/g,'/'))),null,1))" PASTE_THE_G_VALUE
```

Render one recipe without adding it to the gallery:

```bash
node scripts/render.mjs PASTE_THE_G_VALUE trial
```

That writes `out/trial.png`. For a 4K check, prefix with `SIZE=3840x2160`.

## How a preset is written

```ts
make("Deep Horizon", 1, [
  layer("linear", { colors: ["#a9d0ff", "#1a4fd6", "#03061c", "#000000"], bend: 0.35 }),
  layer("grain", { amount: 0.08 }),
]),
```

- `make(name, seed, layers)`. The **seed** moves everything random: where mesh blobs sit, the swirl's shape, the grain pattern. Changing the seed is the cheapest way to get a better composition from the same settings.
- `layer(type, overrides)` starts from the layer's defaults; list only what differs. Control names, ranges and defaults are in each file under `src/layers/`, summarised in `docs/LAYERS.md`.
- Layers draw in order, first at the bottom. A typical strong stack is: one base, optionally a distortion, optionally glass, then one texture.
- Layers can also take `opacity` (0 to 1) and `blend` (`screen`, `multiply`, `overlay`, `add`) beside `type` and `params`. The engine supports them; check `docs/HANDOFF.md` for whether the studio has controls for them yet.

## Rules the tests enforce

- Every value must be inside its control's range, or the round-trip test fails.
- Every layer type must appear in at least one preset.
- There must be at least 12 presets.
- A preset must render identically twice. Leave `speed` at 0 unless the preset is meant to animate.

## What good looks like

These targets come from the Pinterest survey behind the spec (about 230 pins across nine searches) and describe what the strongest pins of each type had in common.

| Type | Target look |
|---|---|
| Horizon fade | Black fills the top half or more. Below it a saturated band (royal blue was most common), then a thin, almost white band along the very bottom. The boundary curves slightly, like the edge of a planet. Fine grain. |
| Aura glow | One warm centre (orange into pink) melting into a pale or dark surround with no visible ring or edge. Often off-centre. Light grain, sometimes only in the transition. |
| Mesh blur | Three to five large colour areas with very soft boundaries, and **one dark anchor area** for contrast. Without the dark area it reads as a flat pastel. Usually with clear, fine grain: the "grainy blur" look. |
| Pastel wash | Nearly white. Faint tints of two or three colours sitting in corners. Almost no grain. Meant for light-mode pages. |
| Liquid swirl | Marbled colour with a few long, confident curves, not many small wrinkles. The "thermal" variant uses blue, white and orange with fairly crisp edges between them. |
| Fluted glass | 20 to 40 ridges. The refraction must be visible: colour boundaries behind the glass should break into steps at each ridge. Works best over a base with strong light-to-dark contrast. Subtle highlights only. |
| Grain | Fine and even. On dark gradients it should look like film, not like static. If the grain is the first thing you notice, it is too strong. |
| Halftone | Dot size must clearly vary across the image, from nearly solid to nearly empty. Two colours (ink on paper) read best. Dots large enough to see as dots at gallery size. |
| Dither | Either pure black and white with a flowing shape, or three to four levels of a strong colour. The pattern should be visible as pixels at 100%. |

Things that make a gradient look cheap, and that the strongest pins avoided:

- Every colour at full saturation with nothing dark or neutral to rest on.
- Purple-to-pink-to-blue as the default palette.
- Visible banding in dark areas (the engine prevents this; if you see it, that is a bug).
- Texture so heavy it hides the colour.
- Perfect symmetry and dead-centre placement.

## Where each draft stands

Judged from the gallery at thumbnail size on 2026-11-12. Treat these as starting points, not verdicts; look at the full-size renders.

| Preset | Layers | Assessment |
|---|---|---|
| Deep Horizon | linear, grain | Close to the target. Could use a thinner bright band at the bottom. |
| Peach Aura | radial, grain (edge) | Good. Centre is dead-centre; try moving it. |
| Blue Mesh | mesh, warp, grain | Good. Has its dark anchor. |
| Violet Dusk | mesh, grain | **Grain far too heavy** (amount 0.22, size 2). Try amount near 0.1 and size 1.5. |
| Ember | linear, warp, grain | Reads as flat horizontal bands. Try more warp, or a bend, or a different seed. |
| Pastel Wash | mesh, grain | On target. |
| Reeded Rose | mesh, fluted-glass, grain | Right half is one flat colour, so the glass has nothing to refract there. Needs more contrast behind the glass or a different seed. |
| Forest Flute | linear, warp, fluted-glass, grain | Good. The strongest of the glass presets. |
| Thermal Swirl | mesh, warp | Good shape. The orange area is flat; try a fourth colour or more warp detail. |
| Blueprint Dots | mesh, halftone | Dots are too small to read as dots (spacing 9). Try 16 to 24, and a base with more light-to-dark range. |
| Mono Dither | linear, warp, dither | Good at 100%. |
| Sunset Dither | radial, dither | Good. |

## As more layer types arrive

Each new type needs at least one preset, and the spec asks for about 50 in total once all 25 types exist: one or more per type, the rest combinations. Favour combinations; the survey's best pins were almost all two or three types layered.

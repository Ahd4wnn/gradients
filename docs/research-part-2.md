# Research part 2 — competitors, Figma, and what to build next

Date: 2026-11-12. Follows part 1 (the Pinterest survey of about 230 pins that produced the 25-type catalogue in `docs/superpowers/specs/2026-11-11-gradient-studio-design.md`).

Question for this round: **what should the studio and the layer catalogue gain next**, judged by what comparable tools ship and what people actually use.

## How this was gathered

| Source | Reached? | How |
|---|---|---|
| Figma Community (plugins and the new Shaders section) | Yes | Browser, logged out. Names and user counts read off the page on this date. |
| GitHub | Yes | Repository search by stars, plus three READMEs. |
| Competitor tools (Neat, Paper Shaders, Unicorn Studio, Shaders, Lumen, ShaderGradient) | Yes | Opened each site or README and read the control lists. |
| Pinterest | Yes | Two more searches (editor UI, 2026 effect trends), on top of the four from the design pass. |
| Figma product news | Partly | Web search summaries only; the help-centre pages would not load directly. Treat as secondary. |
| **Reddit** | **No** | The browser got an "I'm not a robot" check, and web search cannot read reddit.com. Nothing from Reddit is in this file. |
| **X / Twitter** | **No** | Search needs a login in this browser. Nothing from X is in this file. |

Not done: hands-on use of Figma's editor (needs an account), so Figma control details come from listings and descriptions, not from trying them.

## 1. Figma

### Figma now ships shaders

Figma added **Shaders** at Config 2026 (23–25 June 2026, still beta). Two kinds:

- **Shader fills** replace a layer's fill with a generated visual (gradients, patterns, noise, procedural backgrounds).
- **Shader effects** change how an existing layer renders (distortion, grain, recolouring, halftone, blur).

They render with WebGPU, can be stacked, can be saved as styles, are built by prompting the Figma agent, and export through Figma's MCP. Reported as **not yet available: interactive (cursor-reactive) shaders**.

Community categories: **Flow, Distortion, Patterns, Recoloring, Texturing.**

Most-used shaders (users, as listed on the Shaders page sorted by Popular):

| Shader | Users | We have it? |
|---|---|---|
| Mesh gradient ("16 editable colour points, edit directly on the canvas") | 292k | Mesh blur, but points are not editable |
| Water caustic | 170k | No |
| Moving gradient | 168k | Yes (animation speed) |
| Pattern refraction | 115k | Planned (tiled glass, wave 2) |
| Nebula | 109k | No |
| Halftone | 106k | Yes |
| Chromatic metal | 98k | Planned (liquid chrome, wave 3) |
| Clouds | 90k | No |
| Fractal noise | 88k | Only inside warp |
| Moire | 87k | No |
| Shape-based particles | 86k | No |
| Lens distortion | 82k | No |
| Glowing wave | 74k | Planned (wave ribbons) |
| Dither | 73k | Yes |
| Concentric patterns | 70k | Planned (rings and arcs) |
| Gradient map | 70k | No |
| Warp | 67k | Yes |
| Pattern grid | 65k | No |
| Pixelate | 60k | Inside dither only |
| Bokeh blur | 58k | No |
| Outlines | 54k | No |
| Bloom | 51k | No |
| Glowing particles | 47k | No |
| Color adjust | 47k | No |
| Pixel stretch | 45k | Planned (melt) |
| CRT screen | 45k | No |
| Gooey merge | 44k | No |
| Hatching | 43k | Planned (line screen) |
| Slice shift | 41k | No |
| Moving blobs | 39k | Planned (blurred shapes) |
| Colored edges | 38k | No |
| Light rays | 37k | Planned (light beams) |
| Channel mixer | 37k | No |
| Duotone filter | 32k | No |

Also present with smaller numbers: Liquid Metal, Particle Flow Field, Groovy waves, AI Orb, Fluted Light, ASCII Art, Reaction Diffusion, Iridescent Holographic Flow, Thermal Vision, Animated halftone, 3D Inflate, Motion blur + Grain, Distressed ink.

### Figma gradient plugins (what people install)

| Plugin | Users | What it tells us |
|---|---|---|
| Mesh Gradient | 351k | Mesh is the single most wanted gradient type |
| Noisy Gradients | 337k | Grain on a gradient is the second |
| Mesh gradients (paid) | 302k | People pay for "real" mesh with movable points |
| Grainy Gradient | 224k | Same demand again |
| Generative Gradients | 107k | Randomised, art-like output |
| Easing Gradients | 104k | Control over how colours blend between stops |
| CoolHue palette | 77k | Ready-made palettes |
| Vivid Gradient | 47k | Fixing the grey "dead zone" between colours |
| Non Boring Gradients | 45k | Choosing the colour interpolation space |
| Supa Gradient | 46k | Managing and editing gradients as a library |
| Gradient Blob, Shape Blur Gradient | 41k, 9k | Blurred shapes |
| Gradient Map, Gradient Mapper | 22k, 5k | Recolouring a photo through a gradient |
| GradientGaze | 12k | Holographic / iridescent |

Figma's built-in gradient fills are linear and radial (angular and diamond are widely documented but I could not confirm them from Figma's own page in this pass). Built-in effects include noise, texture, progressive blur and a glass effect with light, refraction, depth, dispersion and frost controls.

**Reading:** the engine already answers the two largest demands (mesh and grain) and already blends in OKLab, which is what "Vivid" and "Non Boring" sell. The gaps are editable mesh points, recolouring, and control of blending between stops.

## 2. GitHub

| Repo | Stars | What it is |
|---|---|---|
| shader-effects-inc/shaders | 5.9k | 200+ WebGPU effects as React/Vue/Svelte/Solid components, with a visual editor that exports the component tree. Effects can be nested, blended and masked. Includes cursor effects. |
| paper-design/shaders | 4.0k | Zero-dependency canvas shaders on npm (the library this project originally used and dropped). |
| ruucm/shadergradient | 3.1k | Moving 3D gradients for React, Framer and Figma. |
| latentcat/uvcanvas | 1.4k | React components for shaded canvases. |
| fand/vfx-js | 1.2k | WebGL effects applied to existing page elements. |
| emilwidlund/alma | 0.9k | Node-graph playground for generative shaders. |
| firecmsco/neat | 0.4k | 3D gradient generator (see below). |
| Leonxlnx/lumenshaders | 0.4k | Generative shader studio (see below). |
| anup-a/meshy | 0.4k | Mesh gradient design tool. |

**Reading:** the popular ones are **libraries you install**, not websites. An npm package and per-framework code export matter more for reach than the hosted studio does.

## 3. Competitor tools, feature by feature

### Neat (neat.firecms.co)
- **Preview contexts:** Full bleed, Cards, Website, Mobile, Product. You see the gradient behind real layouts.
- **Image colour extractor:** drop an image, get five dominant colours.
- **Grading:** shadows, highlights, saturation, brightness.
- **Finishing effects:** vignette, bloom, chromatic aberration, rim glow, iridescence, prism edges, film grain (intensity, scale, sparsity, speed).
- **Motion:** speed, wave frequency and amplitude, flow field, domain warp.
- **Shapes:** plane, sphere, torus, cylinder, ribbon, with camera controls.
- **Bottom toolbar:** preset browser with arrow keys, Edit, AI, Code, download, video, screenshot, hide UI. FPS counter.

### Lumen (lumenshaders.vercel.app)
- **Randomise** with `R`, tuned per style so results stay good; **"Keep style"** locks the style while randomising the rest.
- **Gradient sets:** renders 4–12 variations of one design and downloads a ZIP, for consistent art across a site.
- **Perfect loops:** every animation loops seamlessly; loop length is a control.
- **Palettes:** 16 curated plus a harmonic palette generator; hue, saturation, exposure.
- **Lighting:** intensity, gloss, light angle, iridescence, glow, contrast.
- **Keyboard:** `Space` pauses, `S` saves a PNG.
- **Save style** as one-click chips in the browser; share code and share link.

### Paper Shaders (shaders.paper.design)
- **Effects:** mesh gradient, static mesh gradient, static radial gradient, dithering, grain gradient, dot orbit, dot grid, warp, spiral, swirl, waves, neuro noise, perlin, simplex noise, voronoi, pulsing border, metaballs, color panels, smoke ring, god rays.
- **Image filters:** paper texture, fluted glass, water, image dithering, halftone dots, halftone CMYK, lens distortion.
- **Logo animations:** heatmap, liquid metal, gem smoke.

### Unicorn Studio (unicorn.studio)
- Infinite canvas with several scenes side by side.
- **Breakpoints:** desktop, tablet, mobile sizes per scene.
- **Agent:** describe a scene in words; also an MCP.
- Mouse-reactive scenes, variables, events, templates. About 70 effects by one account.

### Shaders (shaders.com)
- Components nest: a `<Shader>` with child layers, blended on the GPU.
- **Blend modes and masks between layers.**
- Cursor effects such as `CursorTrail`.
- Editor exports the exact component tree for React, Vue, Svelte, Solid or plain JS. Has a CLI and AI instructions.

## 4. Pinterest, second pass

- **Editor UI search:** the strongest references show (a) effects picked from a **list with a live thumbnail and a strength percentage each**, (b) colour pickers with a row of **saved palette swatches** above the square, (c) node graphs (already rejected in the spec).
- **2026 trend search:** almost every top pin is **iridescent or holographic**: liquid chrome on black, pearl foil, prism light leaks, soft frosted pastels with small star glints. These are the spec's **wave 3** types (holographic foil, liquid chrome, satin folds, light leaks). The trend argues for building them before some of wave 2.

## 5. What we are missing

### Studio

| # | Gap | Seen in | Why it matters |
|---|---|---|---|
| S1 | **Drag handles on the preview** for mesh points, radial centre, linear angle | Figma mesh gradient (292k), paid mesh plugin (302k) | The most-used gradient feature anywhere. Today mesh point positions come from the seed and cannot be placed. |
| S2 | **Per-layer opacity and blend mode** | Shaders, Figma stacking | Layers currently replace or distort; they cannot be mixed softly. Unlocks far more looks per layer. |
| S3 | **Undo / redo and keyboard shortcuts** (`R` random, `Space` pause, `S` save) | Lumen, Neat | Basic editor quality. |
| S4 | **Lock while randomising** (keep colours, keep layers, or keep one layer) | Lumen | Randomise is all-or-nothing today. |
| S5 | **Add-layer picker with live thumbnails** instead of a text menu | Pinterest editors, Paper | People choose effects by look, not by name. |
| S6 | **Preview contexts** (behind a hero, a card, a phone) | Neat | Shows the gradient the way an agent will use it. |
| S7 | **Colours from an image** | Neat | Brand matching in one step. |
| S8 | **Saved palettes and a palette generator** | Lumen, CoolHue (77k) | The eight built-in palettes are hidden inside Randomise. |
| S9 | **Stop positions and blend easing** per colour list | Easing Gradients (104k) | Stops are evenly spaced only. |
| S10 | **Seamless loop and video / GIF export** | Lumen, Neat | Animation cannot leave the site except as an embed. |
| S11 | **Variation set export** (ZIP of N seeds) | Lumen | One consistent family of backgrounds for a whole site. |
| S12 | **Favourites saved in the browser** | Lumen | No accounts needed. |
| S13 | Drag to reorder layers; phone layout | general | Quality. |

### Layers and effects not in the 25-type catalogue

| Group | New layers | Seen in |
|---|---|---|
| **Recolour** (a new kind) | Gradient map / duotone, colour adjust (hue, saturation, exposure, contrast), posterize, channel mixer | Figma (70k, 47k, 37k, 32k), Neat, Lumen |
| **Finish** (texture kind) | Vignette, bloom, chromatic aberration, CRT / scanlines, paper texture, CMYK halftone, moire, ASCII | Neat, Lumen, Figma, Paper |
| **Base** | Water caustics, clouds / fractal noise, nebula with stars, voronoi cells, metaballs / gooey blobs, spiral, swirl, dot grid | Figma (170k, 109k, 90k, 88k), Paper |
| **Distort** | Lens distortion, slice shift, ripple, pixelate as its own layer | Figma (82k, 60k, 41k), Paper |
| **Cursor** | Follow, liquid push, spotlight (already planned, on hold), cursor trail | Shaders, Unicorn. Figma has none yet. |

## 6. Recommendation

**Studio, in this order**
1. **S1 drag handles on the preview.** Biggest single quality jump, and the feature with the most demonstrated demand.
2. **S2 layer opacity and blend mode.** Small engine change, multiplies what every existing layer can do.
3. **S3 + S4 undo/redo, shortcuts, lock-while-randomising.** Cheap, makes the studio feel finished.
4. **S5 thumbnail layer picker**, which becomes necessary once the catalogue grows past ten.
5. **S7 + S8 image colours and saved palettes.**
6. **S6 preview contexts**, then **S10 loop and video export** (the largest piece of work here).

**Layers, in this order**
1. **Recolour kind first:** gradient map and colour adjust. Two shaders, and they make every existing gradient re-colourable in one move.
2. **Finish trio:** vignette, bloom, chromatic aberration. Small shaders that every competitor has.
3. **Pull wave 3 forward:** holographic foil and liquid chrome, because that is what the 2026 references look like.
4. **Wave 2 as planned**, adding caustics, clouds and voronoi to it since Figma's usage numbers put them above several planned types.
5. **Cursor effects** (plan already written): Figma has not shipped interactive shaders, so this is a place to be ahead.

**For reach, outside this spec:** an npm package with per-framework code export, and the MCP server (sub-project 2). Both Figma and Unicorn Studio now expose an MCP, and the most-starred projects are installable libraries.

## Sources

- Figma Community: https://www.figma.com/community/shaders and https://www.figma.com/community/search?resource_type=plugins&query=gradient (read 2026-11-12)
- Figma mesh gradient shader: https://www.figma.com/community/shader/1650660537411598424/mesh-gradient
- Figma Config 2026 summary: https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026 and https://dev.classmethod.jp/en/articles/figma-config-2026-recap/ (via search summary)
- Figma gradients help: https://help.figma.com/hc/en-us/articles/34208860210199-Use-gradients-as-a-fill-or-stroke (via search summary)
- https://github.com/shader-effects-inc/shaders
- https://github.com/paper-design/shaders and https://shaders.paper.design/
- https://github.com/ruucm/shadergradient
- https://github.com/Leonxlnx/lumenshaders
- https://github.com/firecmsco/neat and https://neat.firecms.co/
- https://www.unicorn.studio/
- Pinterest searches: "shader gradient editor ui controls panel", "gradient background trend 2026 holographic chrome glass light leak"

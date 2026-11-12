# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Start with `docs/HANDOFF.md`:** it says what is committed, what is half-finished in the working tree, and what to do next.

Next.js 16 (App Router, `cacheComponents`, Turbopack + Tailwind 4) — read `node_modules/next/dist/docs/` before touching Next APIs; they differ from older versions.

## Commands

- `npm run dev` — dev server on :3000 (`predev` rebuilds `public/embed.js` first)
- `npm run build` / `npm run lint`
- `npm test` — vitest, unit tests in `src/**/*.test.ts`. One file: `npx vitest run src/lib/recipe.test.ts`; one test: add `-t "name"`
- `npm run e2e` — Playwright (`e2e/`), rebuilds the embed, reuses a running dev server (Next allows only one per folder). Runs WebGL on SwiftShader so no GPU is needed. One test: `npx playwright test e2e/render.spec.ts -g "name"`
- `npm run build:embed` — esbuild bundle of `src/embed/gradient-f.ts` → `public/embed.js` (gitignored; rebuild after engine/layer changes before e2e or the render script)
- `node scripts/render.mjs` — with the dev server running, renders every gallery preset to `out/presets/*.png` plus `out/gallery.png`; `node scripts/render.mjs <g> <name>` renders one studio `?g=` value. `SIZE=3840x2160` changes size. Use this to look at output without a browser.

## Architecture

A layered WebGL2 gradient generator: a gallery (`/`), a studio editor (`/studio?g=…`), and a framework-free `<gradient-f>` custom element that third-party sites embed.

**Recipe** (`src/lib/recipe.ts`) is the single data model: `{ v, seed, frame, speed, layers: [{ type, params, hidden? }] }`, max 6 layers. It is serialized as URL-safe base64 JSON (`encodeRecipe`/`decodeRecipe`) and that string is the studio share link, the embed `recipe` attribute, and the preset link. `cleanRecipe` is the trust boundary: it accepts anything, clamps/validates every param against the layer's `controls`, and never throws. Anything coming from a URL or attribute must go through it.

**Layers** (`src/layers/`) are plain `LayerDef` objects: `defaults`, `controls` (drive both the studio UI and validation), a `uniforms(params)` mapper, and a GLSL `fragment` that defines `vec4 layer(vec2 uv)`. Register new ones in `src/layers/index.ts` (`allLayers`); `layers.test.ts` checks defaults match controls and the registry count. `kind` is base (generates colour), distort/surface (sample `uPrev`), or texture.

**Renderer** (`src/engine/renderer.ts`) compiles each layer fragment wrapped with shared GLSL (`src/engine/glsl/common.ts`: noise, OKLab palette helpers, `uPrev`/`uRes`/`uTime`/`uSeed`/`uColors[6]`) and ping-pongs between two half-float FBOs, one pass per visible layer, then an `OUTPUT` pass to the canvas. Uniforms are set by reflecting active uniforms, so a layer just returns names matching its GLSL declarations. A layer that fails to compile is logged and skipped.

**Consumers of the renderer**: `src/embed/gradient-f.ts` (custom element with shadow DOM, resize/visibility observers, context-loss recovery, CSS fallback via `cssFallback`) — the studio's `GradientCanvas` is just a `<gradient-f>`, so all live-canvas lifecycle lives in the element; `Thumb` (gallery thumbnails, drawn at on-screen pixel size to avoid dither moiré); and `exportPng` (offscreen render, refuses sizes beyond the GPU limit). The embed also exposes `window.GradientF.exportPng`, which `scripts/render.mjs` and the e2e tests use.

Design spec and implementation plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`.

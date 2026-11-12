# Gradient Studio

A website for making high-quality gradients for app and website design: layered mesh, grain, glass, halftone and dither effects, exported as PNG up to 4K or as a live embed.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The gallery is at `/`, the studio at `/studio`.

## Check it

```bash
npm test
```

```bash
npm run e2e
```

`npm test` runs the unit tests. `npm run e2e` runs the browser tests; it needs no graphics card.

## Look at the output

With the dev server running:

```bash
node scripts/render.mjs
```

This writes every gallery preset to `out/presets/` as a PNG.

## Embed a gradient

Copy the snippet from the studio. It is one script tag and one element:

```html
<script type="module" src="https://YOUR-SITE/embed.js"></script>
<gradient-f recipe="…" style="display:block;width:100%;height:100vh"></gradient-f>
```

## Documentation

| File | Read it for |
|---|---|
| [docs/HANDOFF.md](docs/HANDOFF.md) | Current state and what to do next. Start here. |
| [CLAUDE.md](CLAUDE.md) | Commands and architecture. |
| [DESIGN.md](DESIGN.md) | The site's visual design. |
| [docs/LAYERS.md](docs/LAYERS.md) | Writing a new gradient layer. |
| [docs/PRESET-TUNING.md](docs/PRESET-TUNING.md) | Tuning gallery presets. |
| [docs/superpowers/specs/](docs/superpowers/specs/) | The approved design spec. |
| [docs/superpowers/plans/](docs/superpowers/plans/) | Implementation plans. |
| [docs/research-part-2.md](docs/research-part-2.md) | Competitor research and feature ideas. |

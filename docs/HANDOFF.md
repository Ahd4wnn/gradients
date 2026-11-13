# Handoff — where the project stands and what to do next

Written 2026-11-12, updated 2026-11-13 three times. Read this first, then `CLAUDE.md`.

## Update 3, 2026-11-13 (night): paid SaaS — accounts, Razorpay, PostgreSQL, new landing page

Not committed; in the working tree on branch `cursor-effects`, on top of update 2.

**MCP server built 2026-11-13** (also uncommitted): `/api/mcp`, paid accounts only, key from the account page, 500 gradients a month. See the MCP section of `CLAUDE.md`. The refunds page now points to business@f13s.com and the "not final" notice is gone from the legal pages; the Terms page still has a "Still to be set by the owner" section.

The owner reordered the plan: sub-project 3 (accounts and payment) comes before the MCP server. Decisions, all by the owner:

- **The studio requires payment.** One lifetime licence: **$25, or ₹2,099 for visitors in India** (guessed from the time zone, switchable). Gallery, landing and legal pages stay public; embedded gradients keep working without an account.
- **Sign-in: email and password** now; "Continue with Google" later.
- **Database: local PostgreSQL, no Docker.** Database `gradientf`, owned by a login of the same name whose password is only in `.env.local`.
- **Razorpay with the LIVE keys** in `.env.local` (git-ignored). Two unpaid orders were created while testing (one INR, one USD; both accepted). No payment has been made by Claude; the paid path was tested by marking a purchase paid in the database.
- **Later:** an MCP server for agents, with a monthly limit per account.

Built: sign-up / sign-in / sign-out, sessions, checkout with Razorpay Checkout and server-side signature check and capture, reconcile on page load, optional webhook, account page with receipts, paywall on `/studio`, a full landing page (hero, embed strip, features, gallery, how it works, pricing with currency switch, FAQ, closing call to action, footer), legal pages, Motion + GSAP animations. New hero background: the "Dark Opal" preset, moving, with liquid push.

Checks: unit tests, 29 browser tests (4 new for accounts), lint, type-check and production build pass.

**The owner must still:**
- write the **terms** and **refund policy** (both pages show a "not final" note) and add a **contact address**; Razorpay generally expects all three on a live site.
- confirm the FAQ's list of payment methods matches what is enabled on the Razorpay account.
- before deploying: set the four env vars on the host, run `npm run db:migrate`, put the site on HTTPS (the session cookie is `secure` in production), and optionally add the webhook in the Razorpay dashboard.

Known limits: rate limits are in memory (per server process); no password reset or email verification yet (both need an email service); the hero entrance takes about 2.5 s on the dev server.

## Update 2, 2026-11-13 (later): all 25 types, research extras, studio features

Built on top of branch `cursor-effects`. **Not committed yet**: it is all in the working tree.

- **All 25 spec types are built.** The last five: thermal contour (`thermal`), line screen (`line-screen`), gradient bars (`bars`), layered waves (`waves`), retro stripes and sunbursts (`stripes`, with a style select).
- **Eight extra layers from `docs/research-part-2.md`**, which the owner approved on 2026-11-13 ("build them"): water caustics, clouds, cells, gradient map, colour adjust, vignette, bloom, chromatic split. 34 layers in total.
- **12 new presets** (44 total), one or more per new layer. None owner-approved; they join the review in `docs/PRESET-TUNING.md`.
- **Studio features** (research items S1–S5, S7, S8):
  - draggable points on the preview: mesh colour positions (new `points` param, "Reset positions" in the panel), and the centre of aura glow, rings, light beams and retro stripes. Arrow keys move a focused point.
  - per-layer **opacity and blend** in a "Mix" section under the layer's controls.
  - **undo / redo** (buttons and Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y), with a slider drag counted as one step; **R** randomises.
  - **randomise only colours or only layers** (select next to Randomise).
  - **add-layer picker with live thumbnails**, grouped by kind (replaces the dropdown).
  - **palettes**: the eight built-ins, save the current colours in the browser, or take colours from an uploaded image.
- Checks on the working tree: 169 unit tests, 25 browser tests, lint, type-check and production build all pass.
- Not done from the research list: S6 preview contexts, S9 stop positions, S10 loop and video export, S11 variation sets, drag-to-reorder layers (an earlier decision kept buttons), a phone layout check.
- Known limit: a point's dot shows its position before any distortion layer above it, so with a strong liquid swirl the dot can sit off the visible blob.

## Update, 2026-11-13

- The working tree is clean. The earlier session's unfinished work was fixed (two type errors) and committed.
- **19 of 25 layer types are built**, with 30 presets (first tuning pass done 2026-11-13, none owner-approved). The eleven-type plan is done, including its range-end and 4K tests.
- Checks: 97 unit tests, 15 browser tests, lint, type-check and production build all pass.
- The sections "Uncommitted, in the working tree", "Check results" and "Do this first" below describe the state before this update and are kept for history.
- **Cursor effects are built** (2026-11-13, branch `cursor-effects`): liquid push, spotlight, and follow on mesh and aura. Opt-in per recipe; only the hero and the presets "Liquid Touch" and "Spot Lit" use them. Not checked on touch devices, Safari or Firefox.
- **Next: owner review of the 32 presets** (`docs/PRESET-TUNING.md`), then the last five types, then the half-built studio features (opacity and blend controls, draggable points).

## What this project is

A public website for making gradients good enough to pay for, with a studio, a gallery, PNG export to 4K and an embeddable `<gradient-f>` element. The owner's main objective, in their words: the best-looking gradients, not "AI slop", covering **every** gradient type found in a Pinterest survey (25 types).

Three sub-projects, in order:

1. **Studio** — in progress. This repo so far.
2. **MCP server** — not started. Agents create and fetch gradients; returns the recipe, a studio link and embed code. No server-side image rendering. Reuses `src/lib/recipe.ts` and `src/lib/embed.ts` unchanged.
3. **Accounts and Pro plan** — not started. Sign-in, saved gradients, billing, free vs Pro limits.

## Where to find things

| Document | What it is for |
|---|---|
| `CLAUDE.md` | Commands and architecture in one page. |
| `DESIGN.md` | Visual design of the site itself (black page, monochrome chrome, pill controls). |
| `docs/LAYERS.md` | How to write a gradient layer; shared shader functions; rules. |
| `docs/PRESET-TUNING.md` | How to tune and approve gallery presets. **The owner has asked for this to be done.** |
| `docs/superpowers/specs/2026-11-11-gradient-studio-design.md` | The approved spec: 25-type catalogue, quality rules, error handling, testing. |
| `docs/superpowers/plans/2026-11-12-gradient-studio-wave-1.md` | Plan for the first eight types. **Done.** |
| `docs/superpowers/plans/2026-11-12-gradient-studio-wave-2.md` | Plan for the next eleven types, with shader code that has been compiled and rendered. **Not started.** |
| `docs/superpowers/plans/assets/wave-2-reference.jpg` | Contact sheet of what those eleven types looked like when prototyped. |
| `docs/superpowers/plans/2026-11-13-cursor-effects.md` | Plan for opt-in cursor effects (liquid push, spotlight, colours follow). **Done.** |
| `docs/superpowers/plans/assets/cursor-effects-reference.jpg` | Each effect at rest and with a cursor, from the prototype. |
| `docs/DEPLOY.md` | Where the live site runs (https://gradients.f13s.com), how to deploy a new version, and what is not set up yet. |
| `docs/research-part-2.md` | Competitor and Figma research; a prioritised list of studio features and extra layers. |

## State of the code

Branch `studio-wave-1`. `main` holds only the spec and the wave 1 plan. There is no git remote; nothing has been pushed anywhere.

### Committed (through `6da9501`)

The wave 1 build, reviewed by an independent agent, with its findings fixed:

- Engine: raw WebGL2 multi-pass renderer, 16-bit float targets, OKLab colour mixing, output noise against banding.
- Eight layers: `linear` (horizon fade), `radial` (aura glow), `mesh` (mesh blur), `warp` (liquid swirl), `fluted-glass`, `grain`, `halftone`, `dither`.
- Recipe format with a validating decoder (`cleanRecipe`), share links, embed snippets.
- `<gradient-f>` custom element, PNG export, gallery, studio.
- Tests: Vitest unit tests, Playwright browser tests (including a three-layer 3840×2160 export).

### Uncommitted, in the working tree

A second session worked on top of the commit above between about 19:40 and 21:25 on 2026-11-12 and stopped mid-change. Nothing of it is committed.

| Area | What changed | Finished? |
|---|---|---|
| Site redesign to `DESIGN.md` | `globals.css`, `app/page.tsx`, `app/layout.tsx`, `studio/Studio.tsx`, `Controls.tsx`, `LayerStack.tsx`, `GradientCanvas.tsx`; new `ColorPicker.tsx`, `CopyEmbed.tsx`, `Icon.tsx`, `Slider.tsx`, `lib/caption.ts`, `lib/color.ts` (+ test) | Looks finished; browser tests pass against it |
| Grain animation | `layers/grain.ts` crossfades between grain frames so moving grain shimmers instead of flickering | Finished |
| Per-layer opacity and blend mode | Shader side in `engine/glsl/common.ts` (`wrap`), `engine/renderer.ts`; `BLENDS`, `opacity`, `blend` on `Layer` and in `cleanRecipe` | **Engine only. No studio control sets them yet.** |
| Draggable points on the preview | `layers/types.ts`: a `"points"` control type, `Handle`, optional `handles()` / `moveHandle()` on `LayerDef`, `centreHandle()`, a JS copy of the shader's `hash21` | **Types only. No layer or UI uses them. Causes the two type errors below.** |
| New layer kind | `kind` now allows `"recolor"` | No recolour layer exists yet |
| Randomise variants | `lib/recipe.ts`: `PALETTES` exported, `withColors()`, `reroll(recipe, seed, "all" \| "colors" \| "layout")` | Functions exist; check `app/page.tsx` and the studio for how far they are wired |
| Shared shader helpers | new `layers/glsl.ts` with `VORO` (cell noise) and `PICK` (`pick(i)` cycles the colour list, `mixOk`) | Unused so far; the wave 2 plan uses `PICK` |
| Render script | `scripts/render.mjs`, `/out/` in `.gitignore` | Finished (from the first session) |

### Check results on the working tree (23:43 IST)

| Check | Result |
|---|---|
| `npm test` | 48 of 48 pass |
| `npm run e2e` | 13 of 13 pass |
| `npx eslint src e2e scripts` | clean |
| `npx tsc --noEmit` | **2 errors** |
| `npm run build` | **not run** on the working tree; it will fail on the same 2 type errors |

The two type errors, both from the half-added `"points"` control:

- `src/components/Controls.tsx:81` — the last branch assumes every remaining control is a colour list. Add a branch before it: a `"points"` control has no panel UI (it is edited by dragging on the preview), so return `null` for it.
- `src/layers/layers.test.ts:19` — the `else` branch assumes a colour list. Add a `"points"` branch: the default must be an array of numbers with even length, at most `max * 2` long.

## Do this first

1. Check nobody else is mid-edit: `git status` and file times. If another session is working in this folder, coordinate; two writers on the same files will overwrite each other.
2. Fix the two type errors above. Run `npx tsc --noEmit`, `npm test`, `npm run e2e`, `npm run build`.
3. Commit the working tree in sensible pieces (redesign; grain; opacity and blend; points and handles types; randomise variants; shader helpers; render script and docs).

## Then, in this order

This order is a recommendation. The owner decides; ask if unsure.

1. **Finish the two half-built studio features**, since their engine and type work is already in the tree: opacity and blend controls per layer; draggable handles for the radial centre and mesh points. `docs/research-part-2.md` ranks these first (S1, S2).
2. **Eleven more layer types.** Plan is written: `docs/superpowers/plans/2026-11-12-gradient-studio-wave-2.md`. It covers holographic foil, liquid chrome, satin folds, prism streaks, light beams, frosted glass, tiled glass, blurred shapes, rings and arcs, wave ribbons and melt. This is a different eleven from the spec's wave 2: the owner pointed at two references on 2026-11-12 (a Pinterest search for 2026 trends and Figma's Shaders page), and both favour the iridescent types, so those were pulled forward. The plan explains the swap.
3. **Tune the presets with the owner.** See `docs/PRESET-TUNING.md`. The owner asked to be reminded of this.
4. **The last five types:** thermal contour, line screen, gradient bars, layered waves, retro stripes and sunbursts. No plan and no shader code yet.
5. Extra layers and studio features from `docs/research-part-2.md` (recolour layers, vignette, bloom, undo, shortcuts and so on). Not in the approved spec; each needs the owner's go-ahead.
6. Sub-project 2 (MCP server), then sub-project 3 (accounts and Pro).

The spec says nothing ships to the public until all 25 types are in and each has at least one approved preset.

## Decisions already made (do not reopen without the owner)

- Own shader engine, raw WebGL2, no rendering library. Paper Shaders and raea were both evaluated and rejected.
- A gradient is a recipe: up to six layers, drawn in order. It lives in the URL; there is no database in sub-project 1.
- The MCP server returns code and a link, not rendered images.
- Public product with accounts and a paid tier, built after the studio.
- Gallery tiles are still images drawn by one shared renderer. Browsers allow about 16 live WebGL canvases per page.
- The studio is client-only (`studio/page.tsx` loads `Studio.tsx` with `ssr: false`) and reads the recipe from the URL in the `useState` initialiser. An earlier version read it in an effect, and an edit made right at load could overwrite the shared recipe.
- Layer reordering is by up and down buttons, not drag.
- Every preset is approved by the owner before it ships.

## Known gaps

Deferred from the wave 1 review (all minor):

- Shader objects are not deleted after linking (`engine/renderer.ts`).
- Edge grain may draw contour lines when the 8-bit fallback targets are in use.
- Range values from a hand-edited link are clamped to the range but not snapped to the slider step.
- The embed clears a host page's inline `background`, and sets `innerHTML`, which fails under a Trusted Types policy.
- Accessibility: `<gradient-f>` has no role or label; adding, moving or deleting a layer is not announced; `<output>` inside `<label>` changes a slider's accessible name as it moves. Re-check these against the redesigned controls.

Never checked:

- Safari and Firefox.
- A real phone.
- 4K export on a real graphics card. Tests use software rendering, which is the slowest case but not the same as every GPU.
- The wave 2 plan's layers inside the real test suites, in animation, or at 4K. They were compiled and rendered as 960×540 stills in a scratch copy only.

## Things that will bite you

- **One dev server per folder.** Next 16 refuses a second `next dev` in the same directory. The browser tests reuse one on port 3000 if it is running.
- **`public/embed.js` is a build product.** `npm run dev`, `npm run build` and `npm run e2e` rebuild it; after changing engine or layer code while a dev server is already running, run `npm run build:embed` before `scripts/render.mjs`.
- **Look at output with `node scripts/render.mjs`,** then open the PNGs in `out/`. Screenshots of the in-app browser pane time out often.
- **Do not judge dither or halftone from a scaled image.** Shrinking them produces moiré that is not in the render. View at 100%.
- **Next.js 16 differs from older versions.** `AGENTS.md` says to read `node_modules/next/dist/docs/` before using a Next API.
- **`<output>` elements have the `status` role.** Select the status line in tests with `p[role=status]`, or check how the redesign marks it.
- **Git line endings:** `core.autocrlf` is set to `false` in this repo to stop LF/CRLF warnings.

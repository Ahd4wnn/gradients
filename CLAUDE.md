# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Start with `docs/HANDOFF.md`:** it says what is committed, what is half-finished in the working tree, and what to do next.

Next.js 16 (App Router, `cacheComponents`, Turbopack + Tailwind 4) — read `node_modules/next/dist/docs/` before touching Next APIs; they differ from older versions.

## Commands

- **First run:** PostgreSQL must be running locally (no Docker; on this machine it is the Windows service `postgresql-x64-18`, tools in `D:\PostgreSQL\bin`). Copy `.env.example` to `.env.local` and fill it in, then `npm run db:migrate`.
- `npm run db:migrate` — applies `db/schema.sql` (idempotent) to `DATABASE_URL` from `.env.local`
- `npm run dev` — dev server on :3000 (`predev` rebuilds `public/embed.js` first)
- `npm run build` / `npm run lint`
- `npm test` — vitest, unit tests in `src/**/*.test.ts`. One file: `npx vitest run src/lib/recipe.test.ts`; one test: add `-t "name"`
- `npm run e2e` — Playwright (`e2e/`), rebuilds the embed, reuses a running dev server (Next allows only one per folder). Runs WebGL on SwiftShader so no GPU is needed. One test: `npx playwright test e2e/render.spec.ts -g "name"`. Needs the database: `e2e/global-setup.ts` creates a paid test account (`e2e-paid@gradients.test`, fake purchase row, no Razorpay call) and every test runs signed in as it; `account.spec.ts` runs signed out and deletes the `e2e-new-*@gradients.test` accounts it creates.
- `npm run build:embed` — esbuild bundle of `src/embed/gradient-f.ts` → `public/embed.js` (gitignored; rebuild after engine/layer changes before e2e or the render script)
- `npm run lint` must be clean: the React rules reject reading or writing a ref during render.
- `node scripts/render.mjs` — with the dev server running, renders every gallery preset to `out/presets/*.png` plus `out/gallery.png`; `node scripts/render.mjs <g> <name>` renders one studio `?g=` value. `SIZE=3840x2160` changes size. Use this to look at output without a browser.

## Architecture

A layered WebGL2 gradient generator: a gallery (`/`), a studio editor (`/studio?g=…`), and a framework-free `<gradient-f>` custom element that third-party sites embed.

**Recipe** (`src/lib/recipe.ts`) is the single data model: `{ v, seed, frame, speed, layers: [{ type, params, hidden?, opacity?, blend? }] }`, max 6 layers. `opacity` and `blend` (one of `BLENDS`) are stored only when they differ from 1 and `"normal"`, so old links stay valid. It is serialized as URL-safe base64 JSON (`encodeRecipe`/`decodeRecipe`) and that string is the studio share link, the embed `recipe` attribute, and the preset link. `cleanRecipe` is the trust boundary: it accepts anything, clamps/validates every param against the layer's `controls`, and never throws. Anything coming from a URL or attribute must go through it.

**Layers** (`src/layers/`, 34 of them) are plain `LayerDef` objects: `defaults`, `controls` (drive both the studio UI and validation), a `uniforms(params)` mapper, and a GLSL `fragment` that defines `vec4 layer(vec2 uv)`. **Read `docs/LAYERS.md` before writing one**: it has the shader rules (OKLab mixing, sizes relative to 1080 px height, seeded randomness) and a checklist. Register new ones in `src/layers/index.ts` (`allLayers`, whose order is the add-layer menu order); `layers.test.ts` pins that order, and `recipe.test.ts` fails if a layer has no preset in `src/lib/presets.ts`. `kind` (base, distort, surface, recolor, texture, cursor) only groups the menu. Opt-in helpers: `src/layers/glsl.ts` (`PICK`, `VORO`). A layer can offer draggable points on the preview through `handles()`/`moveHandle()` (`centreHandle()` for an x/y pair; `mesh` stores pinned positions in a `points` param, and `hash21()` in `types.ts` mirrors the shader so seeded points can be shown).

**Renderer** (`src/engine/renderer.ts`) compiles each layer fragment wrapped with shared GLSL (`src/engine/glsl/common.ts`: noise, OKLab palette helpers, `uPrev`/`uRes`/`uTime`/`uSeed`/`uColors[6]`) and ping-pongs between two half-float FBOs, one pass per visible layer, then an `OUTPUT` pass to the canvas. Per-layer opacity and blend are applied in the shared `main()` of `wrap()`; at opacity 1 and normal blend it skips the extra read, so such a layer renders exactly as before blending existed. Uniforms are set by reflecting active uniforms, so a layer just returns names matching its GLSL declarations. A layer that fails to compile is logged and skipped.

**Consumers of the renderer**: `src/embed/gradient-f.ts` (custom element with shadow DOM, resize/visibility observers, context-loss recovery, CSS fallback via `cssFallback`) — the studio's `GradientCanvas` is just a `<gradient-f>`, so all live-canvas lifecycle lives in the element; `Thumb` (gallery thumbnails, drawn at on-screen pixel size to avoid dither moiré); and `exportPng` (offscreen render, refuses sizes beyond the GPU limit). The embed also exposes `window.GradientF.exportPng`, which `scripts/render.mjs` and the e2e tests use.

**Cursor effects** are opt-in per recipe. Every shader can read `uPointer`, `uPointerVel` and `uHover`; a layer declares `interactive(params)` when it uses them (`cursor-push`, `cursor-light`, and `mesh`/`radial` when `follow` > 0), and `usesPointer(recipe)` tells `<gradient-f>` whether to track the cursor at all. Tracking and smoothing live in `src/embed/gradient-f.ts`. Invariant, enforced by an e2e test: with no cursor (`uHover` 0) every effect returns its input bit for bit, so thumbnails, exports and old links never change.

**Studio** (`src/app/studio/Studio.tsx`, client-only) keeps the recipe in an undo history (`src/lib/history.ts`): pass a `key` naming the control to `setRecipe(next, key)` so a slider or handle drag becomes one undo step; calls without a key are always their own step. Shortcuts: Ctrl/⌘+Z, Ctrl/⌘+Shift+Z or Ctrl+Y, and R to randomise; they are ignored while focus is in a field. `reroll()` randomises everything, only colours, or only layers; `withColors()` applies a palette (built-in `PALETTES`, saved ones in `localStorage`, or `dominantColors()` from `src/lib/extract.ts` for an uploaded image). The add-layer picker (`LayerPicker.tsx`) draws live thumbnails through the shared `Thumb` renderer.

The site's own look follows `DESIGN.md` (monochrome chrome, pill controls); reusable control classes (`.btn`, `.select`, `.slider`, `.handle`, …) live in `src/app/globals.css`. If the dev server serves a stylesheet without a class you just added, it has gone stale: restart `npm run dev`.

**Accounts and payment.** The studio is the paid product: one lifetime licence, $25 or ₹2,099 (`src/lib/pricing.ts`; the server charges from that table, the browser only sends a currency code). Email and password sign-in; "Continue with Google" is planned, and `db/schema.sql` notes where it goes.
- **Database:** local PostgreSQL through `pg` (no ORM). Tables `users`, `sessions` (stores a sha-256 of the cookie token, never the token), `purchases` (status `created` or `paid`). Raw SQL lives in `src/lib/server/`.
- **`src/lib/server/`** is server-only code: `db.ts` (pool), `password.ts` (scrypt), `session.ts` (cookie `gf_session`, httpOnly, 30 days), `account.ts` (`getAccount()`: the one data access function for "who is this and have they paid"), `razorpay.ts` (REST calls with fetch, no SDK; signature checks), `billing.ts` (order, confirm, `reconcile`), `guard.ts` (same-origin check, in-memory rate limit). Never import these from a client component.
- **Gating:** `src/proxy.ts` (Next 16's name for middleware) redirects requests with no session cookie away from `/studio`, `/checkout`, `/account`; each page then calls `getAccount()` for the real check. With `cacheComponents`, anything that reads cookies must render inside `<Suspense>` (see `studio/page.tsx`, `checkout/page.tsx`), or the build fails. The studio itself is `studio/StudioLoader.tsx` → `Studio.tsx`, client-only.
- **Payment flow:** `POST /api/billing/order` creates a Razorpay order and a `created` purchase → Razorpay Checkout (`components/Checkout.tsx`) → `POST /api/billing/verify` checks the HMAC signature, fetches the payment, captures it if only authorised, and marks the purchase `paid` only if order, amount and currency match. `reconcile()` runs on the checkout and account pages to catch payments whose browser closed early. `/api/billing/webhook` is optional and off until `RAZORPAY_WEBHOOK_SECRET` is set (it needs a public URL).
- **The keys in `.env.local` are LIVE Razorpay keys.** Creating an order is harmless, but completing a payment charges a real card. Never pay while testing; mark a purchase paid in the database instead, as `e2e/global-setup.ts` does. Never print or commit the secret.
- All mutating API routes check `sameOrigin()` and rate-limit; auth errors never say whether the email exists.

**MCP server** (`/api/mcp`, paid accounts only). Agents call it to make gradients; it returns a studio link and the HTML and React embed code, never an image.
- **Protocol:** hand-written JSON-RPC in `src/app/api/mcp/route.ts` (Streamable HTTP, stateless: one POST, one JSON reply; GET is 405). No SDK. Checked against the official client library once, by hand; `e2e/mcp.spec.ts` speaks the protocol with plain requests.
- **Tools** live in `src/lib/mcp.ts`, which is pure (no database, no request) and unit-tested: `list_presets`, `list_layers`, `create_gradient`, `random_gradient`. `MCP_GUIDE` describes every feature to the agent (sent as the server instructions and at the top of `list_layers`); a unit test fails if it stops naming a layer kind or blend mode, so update it when a feature is added. `create_gradient` takes a preset name, a studio link (`recipe`) or `layers`, and every result carries the layers as JSON so an agent can edit and resend them. Everything from the caller goes through `cleanRecipe`; what it drops is returned as warnings so an agent can correct itself. Mistakes are `ToolError`s, returned as `isError` results.
- **Keys:** one per account, made on the account page (`components/McpKey.tsx` → `POST /api/mcp/key`), shown once; `api_keys` stores only a sha-256. Sent as `Authorization: Bearer gf_…`. The session cookie does not work on `/api/mcp`.
- **Limit:** `MCP_MONTHLY_LIMIT` (500) gradients per account per UTC calendar month, counted in `mcp_usage` by one atomic statement (`takeMcpUse`). Only the two creating tools count, and only when they succeed. Plus 120 requests a minute per account, in memory.

**Landing page** (`src/app/page.tsx`, server-rendered) animates with two libraries, both off under `prefers-reduced-motion`: Motion (`motion/react`) for the hero entrance, scroll reveals and the layer-name marquee (`components/anim/Motion.tsx`), and GSAP ScrollTrigger for scroll-linked effects (`components/anim/ScrollFx.tsx`; elements opt in with `data-fx="hero" | "hero-bg" | "hero-copy" | "card" | "drift"`). Rule: server HTML must show all content; animations may hide something only after hydration (see `Reveal`). `Thumb` draws only when it nears the viewport, because every draw stalls on a GPU readback.

Design spec and implementation plans: `docs/superpowers/specs/` and `docs/superpowers/plans/`. Competitor research behind the extra layers and studio features: `docs/research-part-2.md`.

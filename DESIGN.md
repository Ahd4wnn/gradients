# DESIGN.md — gradients by f13s

Clean, dark and soft. A pure black page, white type, rounded shapes. The interface is monochrome; **the only colour on screen comes from the gradients themselves.**

Audience: people directing AI agents, and the agents' output. So every gradient is one click from a paste-able embed snippet.

## References

- https://backgrounds.supply/ — floating pill nav, centered hero over a full-bleed background that fades into black, light sans headline with one italic serif word, white + translucent pill buttons, large rounded cards with the name overlaid bottom-left.
- https://grainient.supply/ — black page, centered section headings, big rounded gradient cards, generous spacing.
- Pinterest research (2026-11-12): dark SaaS landing pages and dark creative editors, for the "chrome recedes, artwork glows" studio layout.
- Earlier direction, dropped: "Specimen" (mono uppercase captions, registration marks, plate numbers). Too busy.

## Tokens

| Token | Value | Use |
|---|---|---|
| `ink` | `#000000` | page background |
| `paper` | `#ffffff` | text, primary button fill |
| surface | `white/5` (hover/selected `white/15`) | cards, layer rows, nav pill (`white/10` + blur) |
| border | `white/15` | outlined buttons and selects only |
| muted | `white/50`–`white/75` | secondary text (never below 50%: contrast) |

No accent colour. No shadows or glows. Scrims (black → transparent) are allowed only under text that sits on a gradient: the hero and the card captions.

## Shape

- Buttons, selects, nav: `rounded-full` pills.
- Cards, the studio canvas, code blocks: `rounded-3xl`. Layer rows: `rounded-2xl`.
- Spacing is generous: sections `py-24`, card grid `gap-5`, content max width `max-w-7xl`.

## Type

| Role | Face | Notes |
|---|---|---|
| Headline | Geist Sans, weight 400, `tracking-tight` | centered; exactly one word or phrase in italic Instrument Serif (`<em className="font-serif">`) |
| Body / UI | Geist Sans | sentence case everywhere; no uppercase labels |
| Code | Geist Mono | only for actual code: the embed snippet and the recipe string |

`label` utility = 13px medium sans, for buttons and small values.

## Pages

**Gallery `/`**
1. Floating pill nav (name, section links, white "Studio" pill).
2. Hero: full-height animated gradient fading into black, centered headline, one line of facts, two pills.
3. "Pick a starting point": 3-column grid of 4:3 rounded cards. Name + layer list overlaid bottom-left; `Copy embed` pill top-right. The card is the link into the studio.
4. "From pick to pasted in a minute": three step cards and the embed snippet.

**Studio `/studio`**
- Top bar: back pill, title with the layer list, "Copy link" pill.
- Left card: layer stack + animation speed. Right card: controls for the selected layer. Both are `white/5` rounded cards floating on black, not bordered columns.
- Centre: the gradient, rounded, directly on black. It takes the shape of the selected export size (16:9, 1:1, 9:16), as large as fits.
- Under the gradient: one row of pills — Randomise, Copy HTML, Copy React, export size, and the white "Export PNG" primary.
- Below `lg` it stacks: gradient and actions, layers, controls.

## Controls

Every control is custom-drawn but built on the native element, so keyboard, touch and screen readers keep working. Classes live in `globals.css`.

| Control | Class / component | Look |
|---|---|---|
| Button | `.btn`, `.btn-primary` | `white/10` pill; primary is solid white. Presses in slightly. |
| Icon button | `.icon-btn` + `<Icon>` | 32px circle, 16px line icon (up, down, close, plus). |
| Slider | `<Slider>` / `.slider` | 6px track filled white up to the value, ring thumb, value in a small pill. |
| Dropdown | `.select` | pill with a chevron; the open list is a dark rounded menu with group headings (Chrome/Edge; other browsers show the system list). |
| Layer visibility | `.eye` | eye icon, struck through and dimmed when hidden. |
| On/off | `.switch` | pill switch; white when on. |
| Colour stop | `.swatch` + `<ColorPicker>` | round swatch; clicking opens an inline picker (saturation/brightness square, hue bar, hex field, remove). `+` adds a stop. |
| Text field | `.field` | mono text in a `white/10` pill. |
| Scrollbars | global | thin, `white/20`. |

The dropdown menu is the one place a shadow is allowed: it floats above the page.

## Rules

- Never colour the chrome. Emphasis = white fill or size.
- One italic serif phrase per headline, never more.
- Every interactive element keeps a visible focus ring and its accessible name — the e2e suite selects by them.

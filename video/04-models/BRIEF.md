# Brief: onboarding for "First Light"

Two AI models are each given this exact brief, separately. The two results will be shown side by side in a video, unedited, labelled with the model that made them. This is your one shot: build the best onboarding you can.

Your output folder is named in the task message. Write only inside it. Do not read the other model's folder under `video/04-models/`.

## The product

**First Light** is a phone app for landscape photographers. It tells them when and where the good light will be: golden hour, blue hour, and dark skies for astro. The onboarding sets up what they shoot, which light they chase, their home spot, and how early to be warned.

## What to deliver

One file, `index.html`, in your folder (extra local files beside it are fine). It is the phone **screen content only**:

- The page is exactly **440 × 956 CSS pixels** (`body` that size, `overflow: hidden`). The video draws the phone frame, status bar, Dynamic Island and home indicator around and over it.
- Keep text and controls out of the **top 62 px** and the **bottom 34 px**. Backgrounds may run underneath.
- It **plays by itself on load**: a 24-second walkthrough of the whole onboarding with simulated taps and drags, showing a visible touch indicator wherever it "taps". No user input, no loop. It ends on the last screen and holds.

### The six screens and their timing

Both models follow the same clock so the videos line up. Screen N is the current screen from `(N−1) × 4 s` to `N × 4 s`; move to the next one in the last half second or so of each window.

| # | Seconds | Screen | What happens in the walkthrough |
|---|---|---|---|
| 1 | 0–4 | Welcome | The brand moment. Name, one line of promise, a "Get started" button that gets tapped. |
| 2 | 4–8 | What do you shoot? | Multi-select: landscapes, seascapes, mountains, astro, cityscapes, forests. Three get tapped. |
| 3 | 8–12 | Which light do you chase? | Golden hour, blue hour, dark skies. Two get picked. |
| 4 | 12–16 | Your home spot | Allow location; a place is found (use "Lofoten, Norway") and shown on a simple map or horizon illustration. |
| 5 | 16–20 | How early should we wake you? | A control dragged to "45 min before", with the alert time updating as it moves. |
| 6 | 20–24 | You're set | A summary of tomorrow's light for that place (times for blue hour, sunrise, golden hour), then hold. |

## Look

- A **light interface**: white or near-white. Dark text. Confident, editorial, calm. It should look designed by someone with taste, not assembled from a template.
- **Gradients, a little.** Use this project's own gradient engine as an accent: a sky preview, a card, a glow behind an illustration, a progress element. No more than about a quarter of any screen, and never as the full-screen background.
- Illustrations are drawn in SVG, CSS or canvas. No photos, no images from the internet, no emoji.

### Direction from the founder's references

The founder collected four reference videos. Frame strips are in `video/04-models/inspiration/` (`1-revolut-hero.jpg`, `2-fintech-motion.jpg`, `3-strava-story.jpg`, `4-fuse-gradient-steps.jpg`). **Open and look at all four before you design.** What they want taken from them:

- **Fuse (4), the main reference for gradients.** A white screen with a soft coloured wash across the top third that fades into white, a different colour on each step, behind a calm checklist of steps where finished ones dim and the current one is large. Use our gradient engine for that wash (a mesh or aura with grain, masked or faded into white), and change its colours from step to step.
- **Revolut (1).** One bold, tight, uppercase headline at the top, and a hero object that bursts or assembles into place with real energy, then settles.
- **Fintech (2).** Values that count up, keys and chips that visibly press down, small spring overshoots, and a clean white sheet sliding over a screen.
- **Strava (3).** Thin story-style progress segments at the top that fill as the onboarding moves on, and big, confident numbers.
- **Restraint.** Each of these screens has one idea and a lot of white space. A few elements, very well finished, beat many.

These describe the feel to aim for. Do not copy their logos, names, characters or exact layouts.

### Type: these three families only

Do not use system fonts or any other family (no Inter, Geist, Instrument Serif, Fraunces, Space Grotesk and the like).

| Family (use this exact name) | Load with | For |
|---|---|---|
| `"Bodoni Moda Variable"`, 400–900, with italics | `<link rel="stylesheet" href="/__vendor/fonts/bodoni-moda/index.css">` and `/__vendor/fonts/bodoni-moda/wght-italic.css` | Display and headlines |
| `"Host Grotesk Variable"`, 300–800 | `<link rel="stylesheet" href="/__vendor/fonts/host-grotesk/index.css">` | Body and interface text |
| `"Martian Mono Variable"`, 100–800 | `<link rel="stylesheet" href="/__vendor/fonts/martian-mono/index.css">` | Times, numbers, small labels |

## Motion

Make it move well: screen transitions, staggered entrances, feedback on every simulated tap, values that count or slide, an illustration that comes alive. Plenty of animation, all of it with a reason. Not chaotic.

Use these libraries (already available, no network needed):

- **GSAP 3.15** with every plugin: `<script src="/__vendor/gsap/gsap.min.js"></script>`, and any file from that folder the same way, for example `SplitText.min.js`, `Flip.min.js`, `MorphSVGPlugin.min.js`, `DrawSVGPlugin.min.js`, `CustomEase.min.js`, `MotionPathPlugin.min.js`.
- **Motion 12**: `<script src="/__vendor/motion/motion.js"></script>`, which gives a global `Motion` (`Motion.animate`, `Motion.stagger`, `Motion.spring`, …).

Use either or both. Any other library must be a local file in your folder; nothing may load from the internet when the page runs.

## The gradient engine

```html
<script type="module" src="/embed.js"></script>

<!-- a ready-made gradient by name -->
<gradient-f data-preset="Peach Aura" data-speed="1" style="display:block;width:200px;height:120px"></gradient-f>

<!-- or your own: layers are drawn in order, first at the bottom -->
<gradient-f data-speed="1" data-recipe='{"seed":3,"layers":[{"type":"linear","params":{"colors":["#ffd9a8","#ff8a5c","#3a2a6b"]}},{"type":"grain","params":{"amount":0.08}}]}'></gradient-f>
```

- `data-speed` is how fast it animates; 0 is still.
- Layer types and their controls: `docs/LAYERS.md`, and each file in `src/layers/`. Ready-made presets: `src/lib/presets.ts`. Palettes: `PALETTES` in `src/lib/recipe.ts`.
- Size the element with CSS; round its corners with `border-radius` and `overflow: hidden`.
- At most **six** `<gradient-f>` elements in the page in total. Browsers limit live WebGL canvases.

## How the page is recorded

The page is captured frame by frame by `scripts/video.mjs`, which replaces the clock: `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date`, `performance.now`, CSS animations and transitions, and the Web Animations API all follow the recorder's time. So ordinary animation code works, GSAP and Motion included. Avoid things that need a real clock or a person: user events, `<video>`, timers in Web Workers, `document.timeline.currentTime`.

Put this near the top of the page, exactly:

```html
<script type="application/json" id="video">{ "width": 440, "height": 956, "fps": 30, "duration": 24 }</script>
```

## Checking your work

The dev server is already running. To see your page at chosen moments (seconds):

```bash
node scripts/video.mjs video/04-models/YOUR-FOLDER/index.html --frames 1.5,5.5,9.5,13.5,17.5,22.5 --scale 2
```

It writes PNGs to `out/video/04-models-YOUR-FOLDER/` and prints any page errors. Read the PNGs and look at them.

**Usage is limited.** Write the page, render and look at it, fix what you see. At most **two** render rounds. Do not start or stop servers, install packages, edit anything outside your folder, or commit.

## When you finish

Reply briefly with:

1. The exact model ID you are running as, as your own system prompt states it.
2. The libraries and plugins you used.
3. Anything you know is broken or unfinished.

// Render an HTML scene from video/ to an MP4, one frame at a time, so the result is exact and repeatable.
// Needs the dev server on http://localhost:3000 (`npm run dev`) and ffmpeg on the PATH.
//
//   node scripts/video.mjs video/01-phones.html                  whole video  → out/video/01-phones.mp4
//   node scripts/video.mjs video/01-phones.html --frames 0,3,9   still frames → out/video/01-phones/t3.00.png …
//   node scripts/video.mjs video/01-phones.html --from 4 --to 6  part of it   → out/video/01-phones.4-6.mp4
//   … --scale 2                                                  draw at twice the pixel density (stills come out
//                                                                larger; a video is scaled back down, which sharpens it)
//
// How it works: the page never sees the real clock. Before any page script runs, timers, requestAnimationFrame,
// Date and performance.now are replaced with a clock that only moves when this script says so, and CSS and Web
// Animations are paused and placed by that same clock. So anything that animates (CSS keyframes, GSAP, Motion,
// a requestAnimationFrame loop, our own <gradient-f>) advances exactly one frame per screenshot, however long the
// screenshot takes. A scene is one HTML file; see .claude/agents/video-editor.md for what it must contain.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const args = process.argv.slice(2);
const flags = new Set(["--frames", "--from", "--to", "--scale"]);
const scene = args.find((a, i) => !a.startsWith("--") && !flags.has(args[i - 1]));
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
if (!scene || !fs.existsSync(scene)) {
  console.error("Usage: node scripts/video.mjs video/<scene>.html [--frames 0,2.5,…] [--from s] [--to s] [--scale 2]");
  process.exit(1);
}
const name = path.relative("video", scene).replace(/\\/g, "/").replace(/(\/index)?\.html$/, "").replace(/\//g, "-") || path.basename(scene, ".html");
const dir = path.resolve(path.dirname(scene));
const scale = Number(opt("scale") ?? 1);

/** Runs in every frame of the page before its own scripts. `presets` maps a gallery preset name to its recipe string. */
function installClock(presets) {
  if (window.__clock) return;
  const real = { setTimeout: window.setTimeout.bind(window), raf: window.requestAnimationFrame.bind(window) };
  const RealDate = Date;
  const epoch = RealDate.now();
  let now = 0; // virtual milliseconds since this document was created
  let nextId = 1;
  const timers = new Map();
  const frames = new Map();

  function VDate(...a) {
    if (!new.target) return new RealDate(epoch + now).toString();
    return a.length ? new RealDate(...a) : new RealDate(epoch + now);
  }
  VDate.prototype = RealDate.prototype;
  VDate.now = () => epoch + now;
  VDate.UTC = RealDate.UTC;
  VDate.parse = RealDate.parse;
  window.Date = VDate;
  performance.now = () => now;
  window.setTimeout = (fn, delay, ...rest) => (timers.set(nextId, { fn, rest, at: now + Math.max(0, Number(delay) || 0) }), nextId++);
  window.setInterval = (fn, delay, ...rest) => {
    const every = Math.max(1, Number(delay) || 0);
    return timers.set(nextId, { fn, rest, at: now + every, every }), nextId++;
  };
  window.clearTimeout = window.clearInterval = (id) => void timers.delete(id);
  window.requestAnimationFrame = (fn) => (frames.set(nextId, fn), nextId++);
  window.cancelAnimationFrame = (id) => void frames.delete(id);
  const run = (fn, ...a) => {
    try {
      if (typeof fn === "function") fn(...a);
    } catch (e) {
      console.error(e);
    }
  };

  // <gradient-f data-preset="…"> / data-recipe='{…}' in a scene: give the element its recipe once; it then animates
  // itself through the (virtual) requestAnimationFrame like everything else.
  const b64url = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  function gradients() {
    for (const el of document.querySelectorAll("gradient-f[data-preset]:not([recipe]), gradient-f[data-recipe]:not([recipe])")) {
      try {
        const known = el.dataset.preset ? presets[el.dataset.preset] : null;
        if (el.dataset.preset && !known) throw new Error(`No preset named "${el.dataset.preset}"`);
        const base = el.dataset.recipe ? JSON.parse(el.dataset.recipe) : JSON.parse(atob(known.replace(/-/g, "+").replace(/_/g, "/")));
        el.setAttribute("recipe", b64url(JSON.stringify({ v: 1, seed: 1, frame: 0, ...base, speed: Number(el.dataset.speed ?? base.speed ?? 0) })));
      } catch (e) {
        el.setAttribute("recipe", "");
        console.error(`[video] bad gradient: ${e.message}`);
      }
    }
  }

  // CSS animations, CSS transitions and Web Animations run on the browser's own timeline, which cannot be replaced.
  // So each one is paused when first seen and then placed by hand: its time is the virtual time since it appeared.
  const began = new WeakMap();
  const finished = new WeakSet();
  function sync() {
    gradients();
    for (const a of document.getAnimations()) {
      if (finished.has(a)) continue;
      if (!began.has(a)) {
        if (a.playState === "paused") {
          finished.add(a); // paused by the page itself: leave it to the page
          continue;
        }
        began.set(a, now);
      }
      const t = (now - began.get(a)) * Math.max(0, a.playbackRate || 1);
      const end = a.effect?.getComputedTiming().endTime;
      try {
        if (typeof end === "number" && Number.isFinite(end) && t >= end) {
          finished.add(a);
          a.finish(); // fires "finish" and resolves .finished, which libraries wait on
        } else {
          a.pause();
          a.currentTime = t;
        }
      } catch {
        finished.add(a);
      }
    }
    // SMIL animations inside inline SVG have their own clock too
    for (const svg of document.querySelectorAll("svg")) {
      if (svg.ownerSVGElement) continue;
      try {
        svg.pauseAnimations();
        svg.setCurrentTime(now / 1000);
      } catch {
        /* not an SVG root that animates */
      }
    }
  }

  window.__clock = {
    real,
    sync,
    /** Move time forward by `dt` ms: run the timers that fall due, in order, then one animation frame. */
    tick(dt) {
      gradients(); // before the frame callbacks, so a gradient given its recipe now draws in this same frame
      const to = now + dt;
      for (let guard = 0; guard < 100_000; guard++) {
        let due = null;
        for (const [id, t] of timers) if (t.at <= to && (!due || t.at < due[1].at)) due = [id, t];
        if (!due) break;
        const [id, t] = due;
        now = Math.max(now, t.at);
        if (t.every) t.at += t.every;
        else timers.delete(id);
        run(t.fn, ...t.rest);
      }
      now = to;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const fn of callbacks) run(fn, now);
      sync();
    },
  };
}

const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ deviceScaleFactor: scale });
const problems = [];

// Preset recipes by name, read off the gallery, so a scene can say data-preset="Dark Opal".
const gallery = await context.newPage();
await gallery.goto(BASE + "/");
const presets = Object.fromEntries(
  await gallery.$$eval("a[href^='/studio?g=']", (as) => as.map((a) => [a.getAttribute("aria-label").replace(/^Open | in the studio$/g, ""), new URL(a.href).searchParams.get("g")])),
);
await gallery.close();

await context.addInitScript(installClock, presets);
// The scene's folder, and the animation libraries in node_modules, are served from the site's own origin, so a scene
// loads /embed.js like any page and needs no network: /__scene/… and /__vendor/gsap/… , /__vendor/motion/… .
const VENDOR = { gsap: path.resolve("node_modules/gsap/dist"), motion: path.resolve("node_modules/motion/dist"), fonts: path.resolve("node_modules/@fontsource-variable"), fontsource: path.resolve("node_modules/@fontsource") };
await context.route(`${BASE}/__{scene,vendor}/**`, (route) => {
  const [, kind, ...rest] = decodeURIComponent(new URL(route.request().url()).pathname).split("/");
  const root = kind === "__scene" ? dir : VENDOR[rest.shift()];
  const file = root && path.join(root, ...rest);
  if (!file || !file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: "not found" });
  route.fulfill({ path: file });
});

const page = await context.newPage();
page.on("pageerror", (e) => problems.push(String(e)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
await page.goto(`${BASE}/__scene/${path.basename(scene)}`);
const meta = JSON.parse(await page.locator("script#video").textContent());
const { width, height, fps, duration } = meta;
for (const [k, v] of Object.entries({ width, height, fps, duration })) if (!(v > 0)) throw new Error(`scene meta "${k}" must be a positive number`);
await page.setViewportSize({ width, height });

// An <iframe data-start="1.5"> is held at its first instant until the scene reaches that time, then runs.
const starts = new Map();
async function startOf(frame) {
  if (!starts.has(frame)) {
    const el = frame.parentFrame() ? await frame.frameElement().catch(() => null) : null;
    starts.set(frame, el ? Number(await el.getAttribute("data-start")) || 0 : 0);
  }
  return starts.get(frame);
}
const inFrame = (frame, fn, arg) => frame.evaluate(fn, arg).catch(() => {});
const settle = (frame) => inFrame(frame, () => new Promise((done) => (window.__clock ? window.__clock.real.setTimeout(() => (window.__clock.sync(), done()), 0) : done())));

let clock = 0; // seconds of scene time
/** Advance the whole page by `dt` seconds. `paint` waits for the result to reach the screen (needed before a screenshot). */
async function step(dt, paint, first = false) {
  clock += dt;
  for (const frame of page.frames()) {
    await frame.waitForLoadState("load").catch(() => {});
    const running = clock >= (await startOf(frame));
    await inFrame(frame, ([ms, go]) => (go ? window.__clock?.tick(ms) : window.__clock?.sync()), [dt * 1000, first || (running && dt > 0)]);
  }
  // promise chains and real callbacks (observers, image decodes) run between tasks; catch any animation they start
  for (const frame of page.frames()) await settle(frame);
  if (paint) {
    for (const frame of page.frames()) await settle(frame);
    await page.evaluate(() => new Promise((done) => window.__clock.real.raf(() => window.__clock.real.raf(done))));
  }
}
const goTo = async (t) => {
  while (clock + 1e-9 < t) await step(Math.min(1 / fps, t - clock), clock + 1 / fps + 1e-9 >= t);
};

for (const frame of page.frames()) await frame.waitForLoadState("load").catch(() => {});
await page.evaluate(() =>
  Promise.race([Promise.all([document.fonts.ready, document.querySelector("gradient-f") ? customElements.whenDefined("gradient-f") : null]), new Promise((r) => window.__clock.real.setTimeout(r, 5000))]),
);
// One animation frame at time zero in every frame, so each page draws its first instant (a gradient given its recipe
// just now has only asked for a frame), then everything holds there.
await step(0, true, true);

fs.mkdirSync(`out/video/${name}`, { recursive: true });
const stills = opt("frames");
if (stills) {
  for (const t of stills.split(",").map(Number).sort((a, b) => a - b)) {
    await goTo(t);
    const file = `out/video/${name}/t${t.toFixed(2)}.png`;
    await page.screenshot({ path: file });
    console.log("wrote", file);
  }
} else {
  const from = Number(opt("from") ?? 0);
  const to = Math.min(duration, Number(opt("to") ?? duration));
  const out = `out/video/${name}${opt("from") || opt("to") ? `.${from}-${to}` : ""}.mp4`;
  // PNG frames straight into ffmpeg: H.264, near-lossless, plays everywhere including X
  const ffmpeg = spawn(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", ...(scale !== 1 ? ["-vf", `scale=${width}:${height}:flags=lanczos`] : []), "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise((resolve, reject) => ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))).on("error", reject));
  const total = Math.round((to - from) * fps);
  await goTo(from);
  for (let i = 0; i < total; i++) {
    if (i > 0) await step(1 / fps, true);
    const png = await page.screenshot();
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (i % fps === 0) process.stdout.write(`\r${Math.round((i / total) * 100)}%`);
  }
  ffmpeg.stdin.end();
  await done;
  console.log(`\rwrote ${out} (${total} frames, ${width}x${height} at ${fps} fps)`);
}
if (problems.length) console.log("Page problems:\n" + [...new Set(problems)].slice(0, 20).join("\n"));
await browser.close();

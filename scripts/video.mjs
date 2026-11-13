// Render an HTML scene from video/ to an MP4, one frame at a time, so the result is exact and repeatable.
// Needs the dev server on http://localhost:3000 (`npm run dev`) and ffmpeg on the PATH.
//
//   node scripts/video.mjs video/01-phones.html                  whole video  → out/video/01-phones.mp4
//   node scripts/video.mjs video/01-phones.html --frames 0,3,9   still frames → out/video/01-phones/t3.00.png …
//   node scripts/video.mjs video/01-phones.html --from 4 --to 6  part of it   → out/video/01-phones.4-6.mp4
//
// A scene is one HTML file. See .claude/agents/video-editor.md for the rules it must follow.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const args = process.argv.slice(2);
const scene = args.find((a) => !a.startsWith("--"));
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
if (!scene || !fs.existsSync(scene)) {
  console.error("Usage: node scripts/video.mjs video/<scene>.html [--frames 0,2.5,…] [--from s] [--to s]");
  process.exit(1);
}
const name = path.basename(scene, ".html");
const dir = path.resolve(path.dirname(scene));

const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(String(e)));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));

// Preset recipes by name, read off the gallery, so a scene can say data-preset="Dark Opal".
await page.goto(BASE + "/");
const presets = Object.fromEntries(
  await page.$$eval("a[href^='/studio?g=']", (as) => as.map((a) => [a.getAttribute("aria-label").replace(/^Open | in the studio$/g, ""), new URL(a.href).searchParams.get("g")])),
);

// Serve the scene's folder from the site's own origin, so it can load /embed.js like any page.
await page.route(`${BASE}/__scene/**`, (route) => {
  const file = path.join(dir, decodeURIComponent(new URL(route.request().url()).pathname.replace("/__scene/", "")));
  if (!file.startsWith(dir) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "not found" });
  route.fulfill({ path: file });
});
await page.goto(`${BASE}/__scene/${path.basename(scene)}`);
const meta = JSON.parse(await page.locator("script#video").textContent());
const { width, height, fps, duration } = meta;
for (const [k, v] of Object.entries({ width, height, fps, duration })) if (!(v > 0)) throw new Error(`scene meta "${k}" must be a positive number`);
await page.setViewportSize({ width, height });
await page.evaluate(() => Promise.all([customElements.whenDefined("gradient-f"), document.fonts.ready]));

/** Put the whole page at time t (seconds): every CSS animation, and every gradient's own clock. */
const seek = (t) =>
  page.evaluate(
    async ({ t, presets }) => {
      const b64 = (s) => s.replace(/-/g, "+").replace(/_/g, "/");
      const enc = (r) => btoa(JSON.stringify(r)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = t * 1000;
      }
      for (const el of document.querySelectorAll("gradient-f[data-preset], gradient-f[data-recipe]")) {
        if (!el.__base) {
          if (el.dataset.preset && !presets[el.dataset.preset]) throw new Error(`No preset named "${el.dataset.preset}"`);
          el.__base = el.dataset.recipe ? JSON.parse(el.dataset.recipe) : JSON.parse(atob(b64(presets[el.dataset.preset])));
        }
        const base = el.__base;
        const speed = Number(el.dataset.speed ?? base.speed ?? 0);
        // a still at the right moment: the element is not left to run on the wall clock
        el.setAttribute("recipe", enc({ v: 1, seed: 1, ...base, speed: 0, frame: (base.frame ?? 0) + t * 1000 * speed }));
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    { t, presets },
  );

fs.mkdirSync(`out/video/${name}`, { recursive: true });
const stills = opt("frames");
if (stills) {
  for (const t of stills.split(",").map(Number)) {
    await seek(t);
    const file = `out/video/${name}/t${t.toFixed(2)}.png`;
    await page.screenshot({ path: file });
    console.log("wrote", file);
  }
} else {
  const from = Number(opt("from") ?? 0);
  const to = Math.min(duration, Number(opt("to") ?? duration));
  const out = `out/video/${name}${opt("from") || opt("to") ? `.${from}-${to}` : ""}.mp4`;
  // PNG frames straight into ffmpeg: H.264, near-lossless, plays everywhere including X
  const ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  const done = new Promise((resolve, reject) => ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))).on("error", reject));
  const total = Math.round((to - from) * fps);
  for (let i = 0; i < total; i++) {
    await seek(from + i / fps);
    const png = await page.screenshot();
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (i % fps === 0) process.stdout.write(`\r${Math.round((i / total) * 100)}%`);
  }
  ffmpeg.stdin.end();
  await done;
  console.log(`\rwrote ${out} (${total} frames, ${width}x${height} at ${fps} fps)`);
}
if (problems.length) console.log("Page problems:\n" + [...new Set(problems)].join("\n"));
await browser.close();

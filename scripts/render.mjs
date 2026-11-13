// Render gradients to PNG files so they can be looked at (by a person or an agent) without the browser pane.
// Needs the dev server on http://localhost:3000 (`npm run dev`), which also builds public/embed.js.
//
//   node scripts/render.mjs                 every gallery preset → out/presets/<name>.png, plus out/gallery.png
//   node scripts/render.mjs <g> <name>      one recipe (the ?g= value from a studio URL) → out/<name>.png
//   SIZE=3840x2160 node scripts/render.mjs  change the export size (default 1920x1080)
import { chromium } from "@playwright/test";
import fs from "node:fs";

const [w, h] = (process.env.SIZE ?? "1920x1080").split("x").map(Number);
const [g, name = "recipe"] = process.argv.slice(2);
const browser = await chromium.launch();
// reduced motion: gallery cards otherwise reveal on scroll and would be blank in a full-page screenshot
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: "reduce" });
await page.goto("http://localhost:3000/");
await page.waitForTimeout(1500);
await page.addScriptTag({ url: "/embed.js", type: "module" });
await page.waitForFunction(() => !!window.GradientF);

async function save(encoded, file) {
  const base64 = await page.evaluate(
    async ({ encoded, w, h }) => {
      const recipe = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
      const bytes = new Uint8Array(await (await window.GradientF.exportPng(recipe, w, h)).arrayBuffer());
      let s = "";
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    },
    { encoded, w, h },
  );
  fs.writeFileSync(file, Buffer.from(base64, "base64"));
  console.log("wrote", file);
}

if (g) {
  fs.mkdirSync("out", { recursive: true });
  await save(g, `out/${name}.png`);
} else {
  fs.mkdirSync("out/presets", { recursive: true });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await page.screenshot({ path: "out/gallery.png", fullPage: true });
  console.log("wrote out/gallery.png");
  const links = await page.$$eval("a[href^='/studio?g=']", (as) => as.map((a) => ({ name: a.getAttribute("aria-label").replace(/^Open | in the studio$/g, ""), g: new URL(a.href).searchParams.get("g") })));
  for (const l of links) await save(l.g, `out/presets/${l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
}
await browser.close();

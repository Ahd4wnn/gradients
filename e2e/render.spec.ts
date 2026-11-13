import { expect, test, type Page } from "@playwright/test";
import { allLayers } from "../src/layers";
import { PRESETS } from "../src/lib/presets";
import { layer, type Recipe } from "../src/lib/recipe";

declare global {
  interface Window {
    GradientF: { exportPng(r: Recipe, w: number, h: number, pointer?: { x: number; y: number; vx: number; vy: number; hover: number }): Promise<Blob> };
  }
}

const recipeOf = (...layers: Recipe["layers"]): Recipe => ({ v: 1, seed: 1, frame: 0, speed: 0, layers });

async function open(page: Page) {
  const errors: string[] = [];
  // only the engine's own errors: the dev server and deliberate context loss add unrelated console noise
  page.on("console", (m) => m.type() === "error" && m.text().includes("[gradient-f]") && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/privacy");
  await page.addScriptTag({ url: "/embed.js", type: "module" });
  await page.waitForFunction(() => !!window.GradientF);
  return errors;
}

/** Export in the page and measure the PNG there. */
const probe = (page: Page, recipe: Recipe, w: number, h: number) =>
  page.evaluate(
    async ({ recipe, w, h }) => {
      const bmp = await createImageBitmap(await window.GradientF.exportPng(recipe, w, h));
      const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      let hash = 0;
      const seen = new Set<number>();
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        hash = (Math.imul(hash, 31) + v) | 0;
        if (seen.size < 64) seen.add(v);
      }
      // longest run of consecutive byte-identical rows: long runs are visible bands
      const row = bmp.width * 4;
      let run = 1;
      let maxRun = 1;
      for (let y = 1; y < bmp.height; y++) {
        let same = true;
        for (let x = 0; x < row; x++)
          if (d[y * row + x] !== d[(y - 1) * row + x]) {
            same = false;
            break;
          }
        run = same ? run + 1 : 1;
        if (run > maxRun) maxRun = run;
      }
      // largest jump in the blue channel's row average between neighbouring rows: a staircase means banding
      let maxStep = 0;
      let prev = -1;
      for (let y = 0; y < bmp.height; y++) {
        let sum = 0;
        for (let x = 2; x < row; x += 4) sum += d[y * row + x];
        const mean = sum / bmp.width;
        if (prev >= 0) maxStep = Math.max(maxStep, Math.abs(mean - prev));
        prev = mean;
      }
      return { w: bmp.width, h: bmp.height, distinct: seen.size, hash, maxRun, maxStep };
    },
    { recipe, w, h },
  );

test("every layer compiles and draws", async ({ page }) => {
  const errors = await open(page);
  const plain = await probe(page, recipeOf(layer("mesh")), 128, 128);
  for (const def of allLayers) {
    const out = await probe(page, recipeOf(layer("mesh"), layer(def.id)), 128, 128);
    expect(out.distinct, def.id).toBeGreaterThan(1);
    // a layer that silently failed would leave the mesh untouched (mesh over mesh repaints, so skip base layers)
    // cursor layers are meant to change nothing without a cursor; "each cursor effect responds to a cursor" covers them
    if (def.kind !== "base" && def.kind !== "cursor") expect(out.hash, def.id).not.toBe(plain.hash);
  }
  expect(errors).toEqual([]);
});

test("presets render, and render the same twice", async ({ page }) => {
  await open(page);
  for (const { name, recipe } of PRESETS) {
    const a = await probe(page, recipe, 256, 144);
    const b = await probe(page, recipe, 256, 144);
    expect(a.distinct, name).toBeGreaterThan(1);
    expect(a.hash, name).toBe(b.hash);
  }
});

test("three-layer 4K export has the requested size", async ({ page }) => {
  await open(page);
  const out = await probe(page, recipeOf(layer("mesh"), layer("warp"), layer("grain")), 3840, 2160);
  expect([out.w, out.h]).toEqual([3840, 2160]);
  expect(out.distinct).toBeGreaterThan(1);
});

test("no banding in a smooth dark gradient", async ({ page }) => {
  await open(page);
  // 16 brightness levels over 1024 rows: without the output noise this bands every ~64 rows
  const out = await probe(page, recipeOf(layer("linear", { colors: ["#000000", "#10101c"] })), 512, 1024);
  expect(out.maxRun).toBeLessThan(8);
  // 8-bit intermediate targets would step by about 1.0 at each band edge; a true ramp moves about 0.03 per row
  expect(out.maxStep).toBeLessThan(0.4);
});

test("oversize export is refused with the largest workable size", async ({ page }) => {
  await open(page);
  const message = await page.evaluate(
    (recipe) => window.GradientF.exportPng(recipe, 1_000_000, 16).then(() => "resolved", (e: Error) => e.message),
    recipeOf(layer("mesh")),
  );
  expect(message).toMatch(/up to \d+px/);
});

test("embed survives abuse", async ({ page }) => {
  const errors = await open(page);
  await page.addScriptTag({ url: "/embed.js?again", type: "module" }); // loaded twice
  const size = await page.evaluate(async () => {
    const el = document.createElement("gradient-f");
    el.style.cssText = "display:none;width:300px;height:200px";
    el.setAttribute("recipe", "%%% not a recipe");
    document.body.append(el); // zero size while hidden
    el.remove();
    document.body.append(el); // reconnect
    el.style.display = "block";
    el.removeAttribute("recipe");
    await new Promise((r) => setTimeout(r, 300));
    const canvas = el.shadowRoot!.querySelector("canvas")!;
    return [canvas.width / devicePixelRatio, canvas.height / devicePixelRatio];
  });
  expect(size).toEqual([300, 200]); // a canvas that never rendered would still be the default 300x150
  expect(errors).toEqual([]);
});

test("an element larger than the GPU limit still renders", async ({ page }) => {
  await open(page);
  const out = await page.evaluate(async () => {
    const el = document.createElement("gradient-f");
    el.style.cssText = "display:block;width:50px;height:40000px";
    document.body.append(el);
    await new Promise((r) => setTimeout(r, 400));
    const canvas = el.shadowRoot!.querySelector("canvas")!;
    const gl = document.createElement("canvas").getContext("webgl2")!;
    const result = { height: canvas.height, max: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, note: !!el.shadowRoot!.querySelector("p") };
    el.remove();
    return result;
  });
  expect(out.height).toBeLessThanOrEqual(out.max);
  expect(out.height).toBeGreaterThan(150);
  expect(out.note).toBe(false);
});

const WAVE_2 = ["holo-foil","chrome","satin","prism","beams","shapes","rings","frosted-glass","tiled-glass","ribbons","melt","caustics","clouds","cells","bars","waves","stripes","gradient-map","color-adjust","thermal","line-screen","vignette","bloom","chromatic"];

test("new layers survive the ends of their ranges", async ({ page }) => {
  const errors = await open(page);
  for (const def of allLayers.filter((d) => WAVE_2.includes(d.id))) {
    for (const end of ["min", "max"] as const) {
      const params: Record<string, number> = {};
      for (const c of def.controls) if (c.type === "range") params[c.key] = c[end];
      // alone, reading black below it: must export without throwing
      expect((await probe(page, recipeOf(layer(def.id, params)), 96, 96)).w, `${def.id} alone at ${end}`).toBe(96);
      // over a mesh: a NaN reaches the canvas as black, so a blacked-out frame shows up as a single colour
      expect((await probe(page, recipeOf(layer("mesh"), layer(def.id, params)), 96, 96)).distinct, `${def.id} over mesh at ${end}`).toBeGreaterThan(1);
    }
  }
  // one colour where one is allowed
  expect((await probe(page, recipeOf(layer("mesh"), layer("beams", { colors: ["#ffffff"] })), 96, 96)).distinct).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test("heavy stack exports at 4K", async ({ page }) => {
  await open(page);
  const out = await probe(page, recipeOf(layer("mesh"), layer("chrome", { tint: 0.8 }), layer("frosted-glass"), layer("tiled-glass"), layer("holo-foil", { amount: 0.4 }), layer("grain")), 3840, 2160);
  expect([out.w, out.h]).toEqual([3840, 2160]);
  expect(out.distinct).toBeGreaterThan(1);
});

const HOVER = { x: 0.35, y: 0.6, vx: 0.6, vy: 0.1, hover: 1 };
const hashAt = (page: Page, recipe: Recipe, pointer?: typeof HOVER) =>
  page.evaluate(
    async ({ recipe, pointer }) => {
      const d = new Uint8Array(await (await window.GradientF.exportPng(recipe, 192, 108, pointer)).arrayBuffer());
      let h = 0;
      for (const v of d) h = (Math.imul(h, 31) + v) | 0;
      return h;
    },
    { recipe, pointer },
  );

test("with no cursor, cursor effects change nothing", async ({ page }) => {
  await open(page);
  const plain = recipeOf(layer("mesh"), layer("warp"), layer("radial", { cy: 0.2 }), layer("grain"));
  const withEffects = recipeOf(layer("mesh", { follow: 1 }), layer("warp"), layer("radial", { cy: 0.2, follow: 1 }), layer("cursor-push"), layer("cursor-light"), layer("grain"));
  // the radial repaints the frame, so compare it separately from the mesh
  expect(await hashAt(page, withEffects)).toBe(await hashAt(page, plain));
  expect(await hashAt(page, recipeOf(layer("mesh", { follow: 1 }), layer("cursor-push"), layer("cursor-light")))).toBe(await hashAt(page, recipeOf(layer("mesh"))));
});

test("each cursor effect responds to a cursor", async ({ page }) => {
  await open(page);
  for (const recipe of [
    recipeOf(layer("mesh", { follow: 1 })),
    recipeOf(layer("radial", { follow: 1 })),
    recipeOf(layer("rings"), layer("cursor-push")),
    recipeOf(layer("mesh"), layer("cursor-light")),
    recipeOf(layer("cursor-light")), // alone, over black
  ])
    expect(await hashAt(page, recipe, HOVER), recipe.layers.map((l) => l.type).join("+")).not.toBe(await hashAt(page, recipe));
});

import { expect, test, type Page } from "@playwright/test";
import { encodeRecipe, layer, type Recipe } from "../src/lib/recipe";

const recipeOf = (...layers: Recipe["layers"]): Recipe => ({ v: 1, seed: 1, frame: 0, speed: 0, layers });
const LIT = encodeRecipe(recipeOf(layer("linear", { colors: ["#000000", "#101030"] }), layer("cursor-light", { strength: 1, radius: 0.5 })));
const PLAIN = encodeRecipe(recipeOf(layer("linear", { colors: ["#000000", "#101030"] })));

/** A page with one 400x300 gradient at the top left, an overlaid button, and room to scroll. */
async function mount(page: Page, recipe: string) {
  await page.goto("/");
  await page.addScriptTag({ url: "/embed.js", type: "module" });
  await page.evaluate((recipe) => {
    document.body.innerHTML = `
      <div style="position:relative;width:400px;height:300px">
        <gradient-f id="g" recipe="${recipe}" style="display:block;width:400px;height:300px"></gradient-f>
        <button style="position:absolute;left:100px;top:100px;width:200px;height:100px">On top</button>
      </div>
      <div style="height:3000px"></div>`;
    document.body.style.margin = "0";
  }, recipe);
  await page.waitForTimeout(400);
}
const shot = (page: Page) => page.locator("#g").screenshot();
const settle = (page: Page) => page.waitForTimeout(1500); // the fade-out settles in about 1.2 s

test("cursor effect works under overlaid content", async ({ page }) => {
  await mount(page, LIT);
  await page.mouse.move(700, 500); // outside
  await settle(page);
  const rest = await shot(page);
  await page.mouse.move(200, 150); // over the button that sits on the gradient
  await settle(page);
  expect((await shot(page)).equals(rest)).toBe(false);
});

test("effect fades and the loop stops when the cursor leaves", async ({ page }) => {
  await mount(page, LIT);
  await page.mouse.move(700, 500);
  await settle(page);
  const rest = await shot(page);
  await page.mouse.move(50, 50);
  await settle(page);
  const lit = await shot(page);
  expect(lit.equals(rest)).toBe(false);
  // scrolling moves the gradient under a still cursor: the light must move with the cursor, not stay put
  await page.mouse.wheel(0, 20);
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(700, 500);
  await settle(page);
  expect((await shot(page)).equals(rest)).toBe(true);
  // settled and static: no more frames are requested
  const frames = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        const original = window.requestAnimationFrame;
        window.requestAnimationFrame = (cb) => (n++, original(cb));
        setTimeout(() => ((window.requestAnimationFrame = original), resolve(n)), 500);
      }),
  );
  expect(frames).toBe(0);
});

test("reduced motion turns cursor effects off", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await mount(page, LIT);
  await page.mouse.move(700, 500);
  await settle(page);
  const rest = await shot(page);
  await page.mouse.move(200, 150);
  await settle(page);
  expect((await shot(page)).equals(rest)).toBe(true);
  await context.close();
});

test("listeners follow the recipe", async ({ page }) => {
  await mount(page, PLAIN);
  const moves = () =>
    page.evaluate(() => {
      // count pointermove listeners added to window from now on
      const w = window as unknown as { __moves?: number };
      return w.__moves ?? 0;
    });
  await page.evaluate(() => {
    const w = window as unknown as { __moves: number };
    w.__moves = 0;
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, ...rest: unknown[]) => (type === "pointermove" && w.__moves++, (add as (...a: unknown[]) => void)(type, ...rest))) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, ...rest: unknown[]) => (type === "pointermove" && w.__moves--, (remove as (...a: unknown[]) => void)(type, ...rest))) as typeof window.removeEventListener;
  });
  expect(await moves()).toBe(0); // plain recipe: nothing listening
  await page.evaluate((r) => document.getElementById("g")!.setAttribute("recipe", r), LIT);
  expect(await moves()).toBe(1);
  await page.evaluate((r) => document.getElementById("g")!.setAttribute("recipe", r), PLAIN);
  expect(await moves()).toBe(0);
  await page.evaluate((r) => document.getElementById("g")!.setAttribute("recipe", r), LIT);
  await page.evaluate(() => document.getElementById("g")!.remove());
  expect(await moves()).toBe(0);
});

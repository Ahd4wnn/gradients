import { expect, test } from "@playwright/test";
import { PRESETS } from "../src/lib/presets";
import { decodeRecipe, encodeRecipe, PALETTES } from "../src/lib/recipe";

const recipeInUrl = (url: string) => decodeRecipe(new URL(url).searchParams.get("g"));

test("gallery links every preset into the studio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Open .* in the studio/ })).toHaveCount(PRESETS.length);
  await page.getByRole("link", { name: "Open Peach Aura in the studio" }).click();
  await expect(page).toHaveURL(/\/studio\?g=/);
  expect(recipeInUrl(page.url())).toEqual(PRESETS[1].recipe);
});

test("editing a control updates the share link", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`); // Blue Mesh: mesh, warp, grain
  await expect(page.locator("gradient-f")).toBeVisible();
  await page.getByLabel("Sharpness").fill("5");
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.sharpness).toBe(5);
});

test("layers can be added, hidden, moved and deleted with the keyboard-operable buttons", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[0].recipe)}`); // Deep Horizon: linear, grain
  await page.getByRole("button", { name: "Add layer", exact: true }).click();
  await page.getByRole("button", { name: "Add Fluted glass" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers.map((l) => l.type)).toEqual(["linear", "grain", "fluted-glass"]);
  await page.getByRole("button", { name: "Move Fluted glass up" }).click();
  await page.getByLabel("Show Grain").uncheck();
  await expect.poll(() => recipeInUrl(page.url()).layers.map((l) => [l.type, !!l.hidden])).toEqual([["linear", false], ["fluted-glass", false], ["grain", true]]);
  await page.getByRole("button", { name: "Delete Grain" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers).toHaveLength(2);
});

test("export downloads a PNG and reports it", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel("Export size").selectOption("1280x720");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export PNG" }).click()]);
  expect(download.suggestedFilename()).toBe("gradient-1280x720.png");
  await expect(page.locator("p[role=status]")).toHaveText("Saved 1280×720 PNG");
});

test("a broken share link still opens the studio", async ({ page }) => {
  await page.goto("/studio?g=%25%25not-a-recipe");
  await expect(page.locator("gradient-f")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add layer", exact: true })).toBeEnabled();
});

test("moving a layer with the keyboard keeps focus on that layer", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`); // Blue Mesh: mesh, warp, grain
  await page.getByRole("button", { name: "Move Grain up" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect.poll(() => recipeInUrl(page.url()).layers.map((l) => l.type)).toEqual(["grain", "mesh", "warp"]);
  // at the top the up button is disabled, so focus moves to the same row's down button
  await expect(page.getByRole("button", { name: "Move Grain down" })).toBeFocused();
  await page.getByRole("button", { name: "Delete Liquid swirl" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Mesh blur", exact: true })).toBeFocused();
});

test("undo and redo walk back through edits; one slider drag is one step", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`); // Blue Mesh
  const undo = page.getByRole("button", { name: "Undo" });
  await expect(undo).toBeDisabled();
  for (const v of ["3", "4", "5"]) await page.getByLabel("Sharpness").fill(v); // quick edits to one control merge
  await page.getByRole("button", { name: "Delete Grain" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers).toHaveLength(2);
  await undo.click();
  await expect.poll(() => recipeInUrl(page.url()).layers).toHaveLength(3);
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.sharpness).toBe(5);
  // the keyboard shortcut, with focus outside any text field
  await page.locator("h1").click();
  await page.keyboard.press("Control+z");
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.sharpness).toBe(2.5);
  await expect(undo).toBeDisabled();
  await page.getByRole("button", { name: "Redo" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.sharpness).toBe(5);
});

test("dragging a colour point on the preview pins the mesh points, and reset brings back the seed", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`); // Blue Mesh, mesh selected
  const dot = page.getByRole("button", { name: /^Colour 1:/ });
  const frame = (await page.locator("gradient-f").boundingBox())!;
  await dot.hover();
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width * 0.2, frame.y + frame.height * 0.25, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => (recipeInUrl(page.url()).layers[0].params.points as number[]).length).toBe(8);
  const [x, y] = recipeInUrl(page.url()).layers[0].params.points as number[];
  expect(x).toBeCloseTo(0.2, 1);
  expect(y).toBeCloseTo(0.75, 1); // y is up in the recipe
  // keyboard: arrow keys nudge the focused dot
  await dot.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(() => (recipeInUrl(page.url()).layers[0].params.points as number[])[0]).toBeCloseTo(x + 0.05, 2);
  await page.getByRole("button", { name: "Reset positions" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.points).toEqual([]);
});

test("opacity and blend are saved per layer", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`);
  await page.getByRole("button", { name: "Liquid swirl", exact: true }).click();
  await page.getByLabel("Opacity").fill("0.5");
  await page.getByLabel("Blend").selectOption("screen");
  await expect.poll(() => recipeInUrl(page.url()).layers[1]).toMatchObject({ type: "warp", opacity: 0.5, blend: "screen" });
  await page.getByLabel("Opacity").fill("1");
  await page.getByLabel("Blend").selectOption("normal");
  await expect.poll(() => { const l = recipeInUrl(page.url()).layers[1]; return ["opacity" in l, "blend" in l]; }).toEqual([false, false]);
});

test("a palette recolours the gradient, and randomise can keep the layers", async ({ page }) => {
  await page.goto(`/studio?g=${encodeRecipe(PRESETS[2].recipe)}`); // mesh, warp, grain
  await page.getByRole("button", { name: "Palette 3" }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers[0].params.colors).toEqual(PALETTES[2]);
  await page.getByLabel("What to randomise").selectOption("colors");
  await page.getByRole("button", { name: "Randomise", exact: true }).click();
  await expect.poll(() => recipeInUrl(page.url()).layers.map((l) => l.type)).toEqual(["mesh", "warp", "grain"]);
});

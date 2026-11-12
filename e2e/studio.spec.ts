import { expect, test } from "@playwright/test";
import { PRESETS } from "../src/lib/presets";
import { decodeRecipe, encodeRecipe } from "../src/lib/recipe";

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
  await page.getByLabel("Add layer").selectOption("fluted-glass");
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
  await expect(page.getByLabel("Add layer")).toBeEnabled();
});

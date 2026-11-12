import { expect, test } from "vitest";
import { allLayers } from "../layers";
import { PRESETS } from "./presets";
import { cleanRecipe, cssFallback, decodeRecipe, DEFAULT_RECIPE, encodeRecipe, layer, MAX_LAYERS, randomRecipe } from "./recipe";

test.each(PRESETS)("preset round trip: $name", ({ recipe }) => {
  const encoded = encodeRecipe(recipe);
  expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeRecipe(encoded)).toEqual(recipe);
});

test("presets cover every layer", () => {
  expect(PRESETS.length).toBeGreaterThanOrEqual(12);
  const used = new Set(PRESETS.flatMap((p) => p.recipe.layers.map((l) => l.type)));
  for (const def of allLayers) expect(used).toContain(def.id);
});

test("garbage returns default", () => {
  for (const s of [null, undefined, "", "%%%", "e30", btoa("[]"), btoa("null"), btoa('{"layers":[]}'), "A".repeat(30000)])
    expect(decodeRecipe(s)).toEqual(DEFAULT_RECIPE);
});

test("hostile values are clamped or dropped", () => {
  const r = cleanRecipe({
    seed: 1e99,
    frame: -5,
    speed: "fast",
    layers: [
      { type: "__proto__", params: {} },
      { type: "constructor" },
      { type: "nope" },
      null,
      7,
      { type: "linear", hidden: "yes", params: { angle: 99999, bend: NaN, spread: "x", colors: ["red", "#12345", "#ffffff"], extra: 1 } },
      ...Array.from({ length: 50 }, () => ({ type: "grain" })),
    ],
  });
  expect(r.seed).toBe(9999);
  expect(r.frame).toBe(0);
  expect(r.speed).toBe(0);
  expect(r.layers).toHaveLength(MAX_LAYERS);
  // one valid colour is below the minimum of two, so colours fall back to the default
  expect(r.layers[0]).toEqual({ type: "linear", params: { colors: ["#a9d0ff", "#1a4fd6", "#03061c"], angle: 360, bend: 0, spread: 1 } });
  expect(r.layers[1]).toEqual(layer("grain"));
});

test("hidden survives only as true", () => {
  expect(cleanRecipe({ layers: [{ ...layer("mesh"), hidden: true }] }).layers[0].hidden).toBe(true);
  expect("hidden" in cleanRecipe({ layers: [{ ...layer("mesh"), hidden: false }] }).layers[0]).toBe(false);
});

test("randomRecipe is deterministic and valid", () => {
  for (let n = 0; n < 50; n++) {
    const r = randomRecipe(n);
    expect(r).toEqual(randomRecipe(n));
    expect(cleanRecipe(r)).toEqual(r);
  }
});

test("layer() rejects unknown types", () => {
  expect(() => layer("nope")).toThrow('Unknown layer "nope"');
});

test("cssFallback uses the first colour list", () => {
  expect(cssFallback(DEFAULT_RECIPE)).toBe("linear-gradient(to top, #0b1d51, #1e6bff, #9fd3ff, #e8f4ff, #e8f4ff)");
  expect(cssFallback({ ...DEFAULT_RECIPE, layers: [layer("grain")] })).toBe("linear-gradient(to top, #111111, #111111)");
});

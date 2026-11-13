import { expect, test } from "vitest";
import { dominantColors } from "./extract";

const image = (...blocks: [number, number, number, number][]) => {
  const out: number[] = [];
  for (const [r, g, b, n] of blocks) for (let i = 0; i < n; i++) out.push(r, g, b, 255);
  return new Uint8ClampedArray(out);
};

test("finds the blocks of a flat image, dark to light", () => {
  expect(dominantColors(image([255, 0, 0, 300], [0, 0, 255, 300], [255, 255, 255, 300]), 3)).toEqual(["#0000ff", "#ff0000", "#ffffff"]);
});

test("is deterministic", () => {
  const img = image([10, 200, 90, 500], [240, 120, 20, 700], [30, 30, 60, 200], [250, 250, 240, 100]);
  expect(dominantColors(img)).toEqual(dominantColors(img));
});

test("a one-colour image still gives a usable two-colour list", () => {
  expect(dominantColors(image([12, 34, 56, 400]))).toEqual(["#0c2238", "#0c2238"]);
});

test("transparent pixels are ignored, and an empty image falls back", () => {
  const clear = new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0]);
  expect(dominantColors(clear)).toEqual(["#000000", "#ffffff"]);
});

test("every colour is valid hex and there are at most k", () => {
  const noisy = new Uint8ClampedArray(4 * 5000).map((_, i) => (i % 4 === 3 ? 255 : (i * 7919) % 256));
  const out = dominantColors(noisy, 5);
  expect(out.length).toBeGreaterThanOrEqual(2);
  expect(out.length).toBeLessThanOrEqual(5);
  for (const c of out) expect(c).toMatch(/^#[0-9a-f]{6}$/);
});

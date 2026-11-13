/** Dominant colours of an image, for "colours from image". Pure, so it is testable without a browser. */

type Rgb = [number, number, number];
const dist2 = (a: Rgb, b: Rgb) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const hex = (c: Rgb) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const lightness = (c: Rgb) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/**
 * k-means on up to 4096 opaque pixels of RGBA data. Starts from the farthest-point spread (deterministic, so the
 * same image always gives the same palette), merges near-duplicates, and returns 2..k colours sorted dark to light.
 */
export function dominantColors(rgba: Uint8ClampedArray, k = 5): string[] {
  const px: Rgb[] = [];
  const total = Math.floor(rgba.length / 4);
  const stride = Math.max(1, Math.floor(total / 4096));
  for (let i = 0; i < total; i += stride) if (rgba[i * 4 + 3] > 127) px.push([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
  if (!px.length) return ["#000000", "#ffffff"];

  let centres: Rgb[] = [px.reduce((a, b) => (lightness(b) < lightness(a) ? b : a))];
  while (centres.length < k) {
    let best = px[0];
    let bestD = -1;
    for (const p of px) {
      const d = Math.min(...centres.map((c) => dist2(p, c)));
      if (d > bestD) [best, bestD] = [p, d];
    }
    if (bestD <= 0) break; // fewer distinct colours than k
    centres.push(best);
  }
  for (let iter = 0; iter < 12; iter++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let j = 0;
      for (let c = 1; c < centres.length; c++) if (dist2(p, centres[c]) < dist2(p, centres[j])) j = c;
      sums[j][0] += p[0];
      sums[j][1] += p[1];
      sums[j][2] += p[2];
      sums[j][3]++;
    }
    centres = centres.map((c, j) => (sums[j][3] ? [sums[j][0] / sums[j][3], sums[j][1] / sums[j][3], sums[j][2] / sums[j][3]] : c));
  }
  const out: Rgb[] = [];
  for (const c of centres.sort((a, b) => lightness(a) - lightness(b))) if (!out.some((o) => dist2(o, c) < 18 ** 2)) out.push(c);
  const colors = out.map(hex);
  return colors.length >= 2 ? colors : [colors[0], colors[0]];
}

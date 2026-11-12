import { layer, type Layer, type Recipe } from "./recipe";

const make = (name: string, seed: number, layers: Layer[]): { name: string; recipe: Recipe } => ({ name, recipe: { v: 1, seed, frame: 0, speed: 0, layers } });

export const PRESETS = [
  make("Deep Horizon", 1, [layer("linear", { colors: ["#a9d0ff", "#1a4fd6", "#03061c", "#000000"], bend: 0.35 }), layer("grain", { amount: 0.08 })]),
  make("Peach Aura", 2, [layer("radial", { colors: ["#ffb347", "#ff7eb3", "#ffe1ee"], radius: 0.8 }), layer("grain", { amount: 0.18, mode: "edge" })]),
  make("Blue Mesh", 3, [layer("mesh"), layer("warp", { amount: 0.12 }), layer("grain", { amount: 0.1 })]),
  make("Violet Dusk", 4, [layer("mesh", { colors: ["#16141f", "#5b4bd6", "#c9a8e8"], sharpness: 3 }), layer("grain", { amount: 0.22, size: 2 })]),
  make("Ember", 5, [layer("linear", { colors: ["#ff8a00", "#e52e1a", "#3a0d0d", "#000000"] }), layer("warp", { amount: 0.25, scale: 1.1 }), layer("grain", { amount: 0.1 })]),
  make("Pastel Wash", 6, [layer("mesh", { colors: ["#fdfbfb", "#ffd9e8", "#cfe9ff", "#fff3c4"], sharpness: 1.8 }), layer("grain", { amount: 0.05 })]),
  make("Reeded Rose", 7, [layer("mesh", { colors: ["#2a0a14", "#e8456b", "#ffb3c1"] }), layer("fluted-glass", { count: 32, strength: 4 }), layer("grain", { amount: 0.06 })]),
  make("Forest Flute", 8, [layer("linear", { colors: ["#0d2b1f", "#1f6b4a", "#a8e6c1"], angle: 35 }), layer("warp", { amount: 0.2 }), layer("fluted-glass", { count: 18, strength: 5, angle: 20 }), layer("grain", { amount: 0.07 })]),
  make("Thermal Swirl", 9, [layer("mesh", { colors: ["#0a2a8c", "#2f7bff", "#f4f7ff", "#ff6a1a"], sharpness: 3.5 }), layer("warp", { amount: 0.35, scale: 1.2, detail: 3 })]),
  make("Blueprint Dots", 10, [layer("mesh", { colors: ["#0b1d51", "#1e6bff", "#9fd3ff"] }), layer("halftone", { pitch: 9 })]),
  make("Mono Dither", 11, [layer("linear", { colors: ["#000000", "#ffffff"], angle: 20 }), layer("warp", { amount: 0.3 }), layer("dither", { levels: 2, pixel: 5, pattern: "bayer8" })]),
  make("Sunset Dither", 12, [layer("radial", { colors: ["#ffd6a5", "#f107a3", "#7b2ff7", "#1b1035"], cy: 0.2, radius: 1.1 }), layer("dither", { levels: 4, pixel: 6 })]),
];

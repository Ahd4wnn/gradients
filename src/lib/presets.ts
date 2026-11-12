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
  make("Pearl Foil", 21, [layer("mesh", { colors: ["#f4f0ff", "#cfe0ff", "#ffe0f0", "#e8fff4"], sharpness: 2 }), layer("holo-foil"), layer("grain", { amount: 0.05 })]),
  make("Liquid Chrome", 40, [layer("linear", { colors: ["#000000", "#05050a"] }), layer("chrome", { tint: 0, scale: 0.5, streaks: 1.2, iris: 1 }), layer("grain", { amount: 0.05 })]),
  make("Chrome Tide", 23, [layer("mesh", { colors: ["#02030a", "#1e3fff", "#9fd3ff", "#ff7a3d"] }), layer("chrome", { tint: 0.8, iris: 0.9 }), layer("grain", { amount: 0.05 })]),
  make("Silk Orchid", 24, [layer("linear", { colors: ["#2a0a3a", "#b83280", "#ffc2d9"], angle: 40 }), layer("satin")]),
  make("Opal Satin", 41, [layer("mesh", { colors: ["#f4f0ff", "#cfe0ff", "#ffe0f0", "#e8fff4"] }), layer("holo-foil", { pastel: 0.6 }), layer("satin", { amount: 0.5, folds: 2 })]),
  make("Prism Leak", 25, [layer("linear", { colors: ["#050508", "#0c0c12"] }), layer("prism"), layer("grain", { amount: 0.06 })]),
  make("Cathedral", 26, [layer("linear", { colors: ["#02040c", "#0b1d51", "#123a8c"] }), layer("beams"), layer("grain", { amount: 0.06 })]),
  make("Soft Orbs", 29, [layer("shapes"), layer("grain", { amount: 0.06 })]),
  make("Starlight", 30, [layer("shapes", { colors: ["#fff4f0", "#ff8a5c", "#ffb3c7"], shape: "sparkle", blur: 0.35, count: 5, size: 0.25 }), layer("grain", { amount: 0.08, mode: "edge" })]),
  make("Sunrise Arcs", 35, [layer("rings"), layer("grain", { amount: 0.08 })]),
  make("Seventies", 36, [layer("rings", { colors: ["#f3e6d0", "#e07a2f", "#8a3b12", "#3a1d0c"], fade: 0, cx: 0, cy: 0, count: 9 })]),
  make("Frosted Peach", 27, [layer("shapes", { blur: 0.15 }), layer("frosted-glass")]),
  make("Glass Blocks", 28, [layer("mesh"), layer("warp", { amount: 0.2 }), layer("tiled-glass")]),
  make("Ribbon", 32, [layer("linear", { colors: ["#f6f4ff", "#f6f4ff", "#3b5bff", "#ff7ab8", "#f6f4ff", "#f6f4ff"], spread: 0.6 }), layer("ribbons", { amplitude: 0.2 }), layer("grain", { amount: 0.06, mode: "edge" })]),
  make("Flame Melt", 33, [layer("linear", { colors: ["#ff8a00", "#e52e1a", "#6a3fd6", "#b7a5e8"] }), layer("melt", { amount: 0.3, jag: 0.8 }), layer("grain", { amount: 0.07 })]),
  make("Slow Melt", 34, [layer("linear", { colors: ["#000000", "#ff3d00", "#ffb199", "#f4e9e4"] }), layer("melt", { amount: 0.35, jag: 0, frequency: 6 })]),
];

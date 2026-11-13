import { expect, test } from "vitest";
import { allLayers } from "../layers";
import { callTool, MCP_GUIDE, MCP_TOOLS, ToolError } from "./mcp";
import { PRESETS } from "./presets";
import { BLENDS, cleanRecipe, decodeRecipe, encodeRecipe, PALETTES } from "./recipe";

const ORIGIN = "https://example.test";
const recipeIn = (text: string) => decodeRecipe(text.match(/\/studio\?g=([A-Za-z0-9_-]+)/)![1]);

test("every tool has a name, a description and an object schema", () => {
  expect(MCP_TOOLS.map((t) => t.name)).toEqual(["list_presets", "list_layers", "create_gradient", "random_gradient"]);
  for (const t of MCP_TOOLS) {
    expect(t.description.length).toBeGreaterThan(20);
    expect(t.inputSchema).toMatchObject({ type: "object" });
  }
  // only the tools that make a gradient use up the monthly allowance
  expect(MCP_TOOLS.filter((t) => t.metered).map((t) => t.name)).toEqual(["create_gradient", "random_gradient"]);
});

test("the lists cover every preset and every layer", () => {
  const presets = callTool("list_presets", {}, ORIGIN);
  for (const p of PRESETS) expect(presets).toContain(p.name);
  const listing = callTool("list_layers", {}, ORIGIN);
  const layers = JSON.parse(listing.slice(listing.indexOf("Layers:\n") + 8)) as { id: string; controls: { key: string; type: string; default: unknown }[] }[];
  expect(layers.map((l) => l.id)).toEqual(allLayers.map((l) => l.id));
  expect(layers.find((l) => l.id === "grain")!.controls.find((c) => c.key === "amount")!.default).toBe(0.12);
  // every control of every layer is offered, including the mesh's pinned points
  for (const l of allLayers) expect(layers.find((x) => x.id === l.id)!.controls.map((c) => c.key)).toEqual(l.controls.map((c) => c.key));
  expect(listing).toContain(JSON.stringify(PALETTES));
});

test("a preset by name gives that recipe, a studio link and both snippets", () => {
  const out = callTool("create_gradient", { preset: "  peach aura " }, ORIGIN);
  const peach = PRESETS.find((p) => p.name === "Peach Aura")!.recipe;
  expect(recipeIn(out)).toEqual(peach);
  expect(out).toContain(`<gradient-f recipe="${encodeRecipe(peach)}"`);
  expect(out).toContain(`${ORIGIN}/embed.js`);
  expect(out).toContain("export function Gradient()");
  expect(out).not.toContain("Warnings:");
});

test("layers are validated, and what was dropped is reported", () => {
  const out = callTool(
    "create_gradient",
    { seed: 42, speed: 99, layers: [{ type: "mesh", params: { sharpness: 999, nope: 1 } }, { type: "__proto__" }, { type: "grain", opacity: 0.5, blend: "screen" }] },
    ORIGIN,
  );
  const r = recipeIn(out);
  expect(r.seed).toBe(42);
  expect(r.speed).toBe(4); // clamped
  expect(r.layers.map((l) => l.type)).toEqual(["mesh", "grain"]);
  expect(r.layers[0].params.sharpness).toBe(6); // clamped to the control's range
  expect(r.layers[1]).toMatchObject({ opacity: 0.5, blend: "screen" });
  expect(out).toContain('Unknown layer type "__proto__" was skipped');
  expect(out).toContain('Layer "mesh" has no control "nope"');
  expect(cleanRecipe(r)).toEqual(r);
});

test("colours replace the palette, and bad colours are refused", () => {
  const out = callTool("create_gradient", { preset: "Blue Mesh", colors: ["#111111", "#222222", "#333333"] }, ORIGIN);
  expect(recipeIn(out).layers[0].params.colors).toEqual(["#111111", "#222222", "#333333"]);
  expect(() => callTool("create_gradient", { preset: "Blue Mesh", colors: ["red", "blue"] }, ORIGIN)).toThrow(ToolError);
  expect(() => callTool("random_gradient", { colors: ['#000000"><script>'] }, ORIGIN)).toThrow(ToolError);
});

test("mistakes an agent can fix come back as ToolError with a pointer", () => {
  expect(() => callTool("create_gradient", {}, ORIGIN)).toThrow(/preset .* recipe .* or layers/);
  expect(() => callTool("create_gradient", { recipe: "<script>" }, ORIGIN)).toThrow(/studio link/);
  expect(() => callTool("create_gradient", { preset: "Nope" }, ORIGIN)).toThrow(/list_presets/);
  expect(() => callTool("create_gradient", { layers: [{ type: "nope" }] }, ORIGIN)).toThrow(/list_layers/);
  expect(() => callTool("create_gradient", "garbage", ORIGIN)).toThrow(ToolError);
  expect(() => callTool("delete_everything", {}, ORIGIN)).toThrow(/Unknown tool/);
});

test("random is repeatable by seed and never needs input", () => {
  expect(callTool("random_gradient", { seed: 7 }, ORIGIN)).toBe(callTool("random_gradient", { seed: 7 }, ORIGIN));
  expect(callTool("random_gradient", { seed: 7 }, ORIGIN)).not.toBe(callTool("random_gradient", { seed: 8 }, ORIGIN));
  expect(callTool("random_gradient", null, ORIGIN, () => 0.5)).toContain("/studio?g=");
});

test("nothing from the caller reaches the output unescaped", () => {
  const out = callTool("create_gradient", { layers: [{ type: "mesh", params: { colors: ['#ffffff"><script>alert(1)</script>', "#000000"] } }] }, ORIGIN);
  expect(out).not.toContain("<script>alert");
});

test("the guide names every feature an agent can use", () => {
  // every kind of layer, every blend mode, and each whole-gradient and per-layer option
  for (const kind of new Set(allLayers.map((l) => l.kind))) expect(MCP_GUIDE, kind).toContain(kind + " (");
  for (const b of BLENDS) expect(MCP_GUIDE, b).toContain(b);
  for (const word of ["opacity", "hidden", "seed", "speed", "colors", "points", "follow", "cursor-push", "cursor-light", "list_presets", "recipe", "PNG", "React", "reduced motion"]) expect(MCP_GUIDE, word).toContain(word);
  expect(callTool("list_layers", {}, ORIGIN).startsWith(MCP_GUIDE)).toBe(true);
});

test("a studio link can be turned into code, restyled, or edited and sent back", () => {
  const dark = PRESETS.find((p) => p.name === "Dark Opal")!.recipe;
  const g = encodeRecipe(dark);
  expect(recipeIn(callTool("create_gradient", { recipe: g }, ORIGIN))).toEqual(dark);
  expect(recipeIn(callTool("create_gradient", { recipe: `https://x.test/studio?g=${g}`, speed: 2 }, ORIGIN))).toEqual({ ...dark, speed: 2 });
  // the result carries the layers as JSON; sending them back unchanged gives the same gradient
  const out = callTool("create_gradient", { preset: "Dark Opal" }, ORIGIN);
  const json = JSON.parse(out.split("\n").find((l) => l.startsWith('{"seed"'))!);
  expect(recipeIn(callTool("create_gradient", json, ORIGIN))).toEqual(dark);
  // pinned mesh points and hidden layers pass through
  const pinned = recipeIn(callTool("create_gradient", { layers: [{ type: "mesh", params: { points: [0.1, 0.2, 0.8, 0.9] } }, { type: "grain", hidden: true }] }, ORIGIN));
  expect(pinned.layers[0].params.points).toEqual([0.1, 0.2, 0.8, 0.9]);
  expect(pinned.layers[1].hidden).toBe(true);
});

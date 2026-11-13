import { allLayers, getLayer } from "../layers";
import { caption } from "./caption";
import { toHtml, toReact } from "./embed";
import { PRESETS } from "./presets";
import { BLENDS, cleanRecipe, decodeRecipe, encodeRecipe, MAX_LAYERS, PALETTE_NAMES, PALETTES, randomRecipe, withColors, type Recipe } from "./recipe";

/** Gradients one account may create through the MCP server per calendar month. */
export const MCP_MONTHLY_LIMIT = 500;

/**
 * Everything the product can do, in the words an agent needs. Sent when a client connects and again at the top of
 * list_layers, so a model knows every feature without guessing. Keep it in step with the product: mcp.test.ts checks
 * that it names every layer kind and every blend mode.
 */
export const MCP_GUIDE = [
  "gradients by f13s makes live gradient backgrounds for websites and apps. You get code that draws the gradient, not an image.",
  "",
  "How a gradient is built",
  `- It is a stack of 1 to ${MAX_LAYERS} layers, drawn in order: the first is at the bottom.`,
  "- Layer kinds: base (paints colour: linear fades, aura glows, mesh blurs, shapes, rings, bars, waves, stripes, clouds, cells, caustics); " +
    "distort (bends what is below: swirl, ribbons, melt); surface (glass and materials over what is below: fluted, frosted and tiled glass, chrome, holographic foil, satin, prism streaks, light beams); " +
    "recolor (changes the colours of what is below: gradient map, colour adjust, thermal); texture (film and print finish: grain, halftone, dither, line screen, vignette, bloom, chromatic fringe); " +
    "cursor (reacts to the visitor's cursor: liquid push, spotlight).",
  "- A strong stack: one base, optionally one distort or surface, then one texture such as grain. Call list_layers for every layer's controls, ranges and defaults.",
  "",
  "Per-layer options",
  "- params: the layer's control values. Anything left out uses the default.",
  `- opacity (0 to 1) and blend (${BLENDS.join(", ")}): how the layer mixes over what is below.`,
  "- hidden: true keeps a layer in the stack without drawing it.",
  "- Colour lists are hex colours; most colour layers take 2 to 6.",
  "- Mesh blur takes points: a flat list [x0, y0, x1, y1, …] from 0 to 1 with y up, one pair per colour, to pin where each colour sits. Leave it empty to place them from the seed.",
  "",
  "Whole-gradient options",
  "- seed (0 to 9999): the random layout. Change it for a different composition with the same settings.",
  "- speed (0 to 4): animation. 0 is a still; about 1 is a slow drift.",
  "- colors: replaces the palette on every colour layer at once, for example with brand colours.",
  "",
  "Cursor effects (opt-in; nothing reacts unless you ask)",
  '- Add the layer "cursor-push" (the image bulges away from the cursor) or "cursor-light" (a soft spotlight).',
  '- Or set follow above 0 on "mesh" or "radial" so the colours lean toward the cursor.',
  "- They work in the embedded gradient on any site, switch off for visitors who prefer reduced motion, and never appear in exported images.",
  "",
  "Starting points",
  "- list_presets names the ready-made gradients. create_gradient with preset uses one, and colors, seed and speed can restyle it.",
  "- create_gradient with recipe takes the g value (or the whole link) from a studio URL the person gives you, so you can turn their tuned gradient into code or change it.",
  "- Every result includes the layer list as JSON. To change a gradient, edit that JSON and send it back as layers.",
  "- random_gradient makes a presentable random one.",
  "",
  "What you get back",
  "- A studio link, where the person can fine-tune every control, undo, randomise, pick or extract palettes, drag points, and export a PNG up to 3840 by 2160.",
  "- HTML (one script tag and one <gradient-f> element) and a React component. Paste the code into the project; size the element with CSS.",
  "- The embed needs no account or key and works on any site.",
  "",
  `Limits: ${MCP_MONTHLY_LIMIT} created gradients per account per month. Listing is free.`,
].join("\n");

export const MCP_INSTRUCTIONS = MCP_GUIDE;

type Tool = { name: string; description: string; inputSchema: object; /** counts against the monthly limit */ metered?: boolean };

const colors = { type: "array", items: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }, minItems: 2, maxItems: 6, description: "Replace the gradient's colours with these hex colours, e.g. brand colours." };

export const MCP_TOOLS: Tool[] = [
  {
    name: "list_presets",
    description: "List the ready-made gradients by name, with the layers each one stacks. Use a name with create_gradient.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_layers",
    description: "The full feature guide, the built-in palettes and blend modes, and every layer type with its controls, ranges and defaults. Call this before building a gradient from layers.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_gradient",
    metered: true,
    description:
      `Create a gradient from a preset name, from an existing studio link, or from a stack of 1 to ${MAX_LAYERS} layers drawn in order (first is the bottom). ` +
      "A good stack is one colour layer, optionally a distortion or glass layer, then a texture such as grain. Returns a studio link and embed code.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", description: "A name from list_presets. Ignored when layers is given." },
        recipe: { type: "string", description: "An existing gradient to start from: the g value of a studio link, or the whole link. Ignored when layers or preset is given." },
        layers: {
          type: "array",
          minItems: 1,
          maxItems: MAX_LAYERS,
          items: {
            type: "object",
            properties: {
              type: { type: "string", description: "A layer id from list_layers." },
              params: { type: "object", description: "Control values by key. Anything left out uses the layer's default." },
              opacity: { type: "number", minimum: 0, maximum: 1 },
              hidden: { type: "boolean" },
              blend: { type: "string", enum: [...BLENDS] },
            },
            required: ["type"],
          },
        },
        colors,
        seed: { type: "integer", minimum: 0, maximum: 9999, description: "Changes the random layout (where colour areas sit, the swirl shape, the grain)." },
        speed: { type: "number", minimum: 0, maximum: 4, description: "Animation speed. 0 is a still image." },
      },
    },
  },
  {
    name: "random_gradient",
    metered: true,
    description: "Create a random, presentable gradient. The same seed always gives the same gradient.",
    inputSchema: { type: "object", properties: { seed: { type: "integer", minimum: 0 }, colors } },
  },
];

/** Thrown for mistakes the calling agent can fix; the message is shown to it. */
export class ToolError extends Error {}

function describe(r: Recipe, origin: string, warnings: string[]): string {
  return [
    `Gradient: ${caption(r)}`,
    ...(warnings.length ? ["", "Warnings:", ...warnings.map((w) => `- ${w}`)] : []),
    "",
    `Open in the studio to fine-tune: ${origin}/studio?g=${encodeRecipe(r)}`,
    "",
    "Layers (to change this gradient, edit this JSON and send it back as layers, with the same seed and speed):",
    JSON.stringify({ seed: r.seed, speed: r.speed, layers: r.layers }),
    "",
    "HTML:",
    toHtml(r, origin),
    "",
    "React:",
    toReact(r, origin),
  ].join("\n");
}

const hexList = (v: unknown): string[] | null => (Array.isArray(v) && v.length >= 2 && v.every((c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) ? (v as string[]) : null);

/**
 * Runs one tool. Pure: no database, no request. `args` is untrusted; everything that reaches a recipe goes through
 * cleanRecipe, and the things it would silently drop are reported back as warnings so an agent can correct itself.
 */
export function callTool(name: string, args: unknown, origin: string, random: () => number = Math.random): string {
  const a = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
  const warnings: string[] = [];
  const recolor = (r: Recipe) => {
    if (a.colors === undefined) return r;
    const list = hexList(a.colors);
    if (!list) throw new ToolError('colors must be 2 to 6 hex colours such as "#1e6bff".');
    return withColors(r, list);
  };

  switch (name) {
    case "list_presets":
      return PRESETS.map((p) => `${p.name}: ${caption(p.recipe)}`).join("\n");

    case "list_layers":
      return [
        MCP_GUIDE,
        "",
        `Blend modes: ${BLENDS.join(", ")}`,
        `Built-in palettes (use one as colors): ${JSON.stringify(Object.fromEntries(PALETTES.map((p, i) => [PALETTE_NAMES[i], p])))}`,
        "",
        "Layers:",
        JSON.stringify(allLayers.map((l) => ({ id: l.id, label: l.label, kind: l.kind, controls: l.controls.map((c) => ({ ...c, default: l.defaults[c.key] })) }))),
      ].join("\n");

    case "random_gradient": {
      const seed = typeof a.seed === "number" && Number.isFinite(a.seed) ? Math.abs(Math.floor(a.seed)) : Math.floor(random() * 1e9);
      return describe(recolor(randomRecipe(seed)), origin, warnings);
    }

    case "create_gradient": {
      let raw: Record<string, unknown>;
      if (Array.isArray(a.layers)) {
        if (a.layers.length > MAX_LAYERS) warnings.push(`Only the first ${MAX_LAYERS} layers are used.`);
        for (const item of a.layers.slice(0, MAX_LAYERS)) {
          const l = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          const def = getLayer(l.type);
          if (!def) warnings.push(`Unknown layer type ${JSON.stringify(l.type)} was skipped. Call list_layers for the ids.`);
          else {
            const known = new Set(def.controls.map((c) => c.key));
            for (const key of Object.keys((l.params && typeof l.params === "object" ? l.params : {}) as object))
              if (!known.has(key)) warnings.push(`Layer "${def.id}" has no control "${key}"; it was ignored.`);
          }
        }
        raw = { layers: a.layers };
      } else if (typeof a.preset === "string") {
        const preset = PRESETS.find((p) => p.name.toLowerCase() === (a.preset as string).trim().toLowerCase());
        if (!preset) throw new ToolError(`No preset named ${JSON.stringify(a.preset)}. Call list_presets for the names.`);
        raw = { ...preset.recipe };
      } else if (typeof a.recipe === "string") {
        // accept the bare g value or a whole studio link
        const g = /[?&]g=([A-Za-z0-9_-]+)/.exec(a.recipe)?.[1] ?? a.recipe.trim();
        if (!/^[A-Za-z0-9_-]{8,20000}$/.test(g)) throw new ToolError("recipe must be the g value from a studio link, or the link itself.");
        raw = { ...decodeRecipe(g) };
      } else throw new ToolError("Give preset (a name from list_presets), recipe (from a studio link) or layers (see list_layers).");

      if (a.seed !== undefined) raw.seed = a.seed;
      else if (!("seed" in raw)) raw.seed = Math.floor(random() * 10000);
      if (a.speed !== undefined) raw.speed = a.speed;
      if (Array.isArray(a.layers) && !a.layers.some((l) => getLayer((l as { type?: unknown } | null)?.type)))
        throw new ToolError("None of the layers has a known type. Call list_layers for the ids.");
      return describe(recolor(cleanRecipe(raw)), origin, warnings);
    }

    default:
      throw new ToolError(`Unknown tool ${JSON.stringify(name)}.`);
  }
}

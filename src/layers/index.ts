import { holoFoil } from "./holo-foil";
import { chrome } from "./chrome";
import { satin } from "./satin";
import { prism } from "./prism";
import { beams } from "./beams";
import { shapes } from "./shapes";
import { rings } from "./rings";
import { frostedGlass } from "./frosted-glass";
import { tiledGlass } from "./tiled-glass";
import { ribbons } from "./ribbons";
import { melt } from "./melt";
import { cursorLight } from "./cursor-light";
import { cursorPush } from "./cursor-push";
import { dither } from "./dither";
import { flutedGlass } from "./fluted-glass";
import { grain } from "./grain";
import { halftone } from "./halftone";
import { linear } from "./linear";
import { mesh } from "./mesh";
import { radial } from "./radial";
import type { Recipe } from "../lib/recipe";
import type { LayerDef } from "./types";
import { warp } from "./warp";

export const allLayers: LayerDef[] = [linear, radial, mesh, warp, flutedGlass, grain, halftone, dither, holoFoil, chrome, satin, prism, beams, shapes, rings, frostedGlass, tiledGlass, ribbons, melt, cursorPush, cursorLight];

const byId = new Map(allLayers.map((l) => [l.id, l]));

/** Map lookup, so "constructor" and "__proto__" are not layers. */
export const getLayer = (id: unknown): LayerDef | undefined => (typeof id === "string" ? byId.get(id) : undefined);

/** True when any visible layer reacts to the cursor, so the element knows whether to track it at all. */
export const usesPointer = (recipe: Recipe): boolean =>
  recipe.layers.some((l) => {
    const def = l.hidden ? undefined : getLayer(l.type);
    return !!def?.interactive?.({ ...def.defaults, ...l.params });
  });

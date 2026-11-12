import { dither } from "./dither";
import { flutedGlass } from "./fluted-glass";
import { grain } from "./grain";
import { halftone } from "./halftone";
import { linear } from "./linear";
import { mesh } from "./mesh";
import { radial } from "./radial";
import type { LayerDef } from "./types";
import { warp } from "./warp";

export const allLayers: LayerDef[] = [linear, radial, mesh, warp, flutedGlass, grain, halftone, dither];

const byId = new Map(allLayers.map((l) => [l.id, l]));

/** Map lookup, so "constructor" and "__proto__" are not layers. */
export const getLayer = (id: unknown): LayerDef | undefined => (typeof id === "string" ? byId.get(id) : undefined);

import { getLayer } from "../layers";
import type { Recipe } from "./recipe";

/** Human-readable layer list, e.g. "Mesh blur · Liquid swirl · Grain". */
export const caption = (r: Recipe) => r.layers.filter((l) => !l.hidden).map((l) => getLayer(l.type)?.label ?? l.type).join(" · ");

import { createRenderer, type Pointer } from "../engine/renderer";
import type { Recipe } from "./recipe";

/** Render one still at an exact pixel size. Rejects with a user-facing message; never downsizes silently. */
export async function exportPng(recipe: Recipe, width: number, height: number, pointer?: Pointer): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const renderer = createRenderer(canvas, true);
  if (!renderer) throw new Error("Export needs WebGL2, which is unavailable in this browser.");
  try {
    if (Math.max(width, height) > renderer.maxSize) throw new Error(`This device can export up to ${renderer.maxSize}px on the longest side.`);
    if (!renderer.resize(width, height)) throw new Error("Not enough graphics memory for this size. Try the next size down.");
    renderer.render(recipe, 0, pointer);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The browser could not encode the image. Try the next size down.");
    return blob;
  } finally {
    renderer.dispose();
  }
}

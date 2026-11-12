"use client";
import { useEffect, useRef } from "react";
import { createRenderer, type Renderer } from "@/engine/renderer";
import { cssFallback, type Recipe } from "@/lib/recipe";

// One WebGL context draws every thumbnail: browsers cap live contexts at about 16 per page.
let shared: { canvas: HTMLCanvasElement; renderer: Renderer } | null | undefined;

export function Thumb({ recipe, width = 480, height = 270 }: { recipe: Recipe; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (shared === undefined) {
      const canvas = document.createElement("canvas");
      const renderer = createRenderer(canvas, true);
      shared = renderer ? { canvas, renderer } : null;
    }
    const ctx = ref.current?.getContext("2d");
    if (!shared || !ctx || !shared.renderer.resize(width, height)) return; // CSS background stays as the fallback
    shared.renderer.render(recipe, 0);
    ctx.drawImage(shared.canvas, 0, 0);
  }, [recipe, width, height]);
  return <canvas ref={ref} width={width} height={height} className="block h-full w-full" style={{ background: cssFallback(recipe) }} />;
}

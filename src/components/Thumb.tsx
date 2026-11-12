"use client";
import { useEffect, useRef } from "react";
import { createRenderer, type Renderer } from "@/engine/renderer";
import { cssFallback, type Recipe } from "@/lib/recipe";

// One WebGL context draws every thumbnail: browsers cap live contexts at about 16 per page.
let shared: { canvas: HTMLCanvasElement; renderer: Renderer } | null | undefined;

export function Thumb({ recipe }: { recipe: Recipe }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (shared === undefined) {
      const source = document.createElement("canvas");
      const renderer = createRenderer(source, true);
      shared = renderer ? { canvas: source, renderer } : null;
    }
    // Drawn at the exact on-screen pixel size: scaling a dither or halftone in CSS produces moiré.
    // ponytail: not re-drawn on window resize; add a ResizeObserver if tiles ever look soft after resizing.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const ctx = canvas.getContext("2d");
    if (!shared || !ctx || !shared.renderer.resize(canvas.width, canvas.height)) return; // CSS background stays as the fallback
    shared.renderer.render(recipe, 0);
    ctx.drawImage(shared.canvas, 0, 0);
  }, [recipe]);
  return <canvas ref={ref} className="block h-full w-full" style={{ background: cssFallback(recipe) }} />;
}

"use client";
import "@/embed/gradient-f";
import type { CSSProperties } from "react";
import { encodeRecipe, type Recipe } from "@/lib/recipe";

/** Live canvas. All lifecycle (resize, animation, context loss, fallback) lives in the custom element. */
export function GradientCanvas({ recipe, className, style }: { recipe: Recipe; className?: string; style?: CSSProperties }) {
  return <gradient-f recipe={encodeRecipe(recipe)} className={className} style={style} />;
}

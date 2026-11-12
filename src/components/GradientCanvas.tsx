"use client";
import "@/embed/gradient-f";
import { encodeRecipe, type Recipe } from "@/lib/recipe";

/** Live canvas. All lifecycle (resize, animation, context loss, fallback) lives in the custom element. */
export function GradientCanvas({ recipe, className }: { recipe: Recipe; className?: string }) {
  return <gradient-f recipe={encodeRecipe(recipe)} className={className} />;
}

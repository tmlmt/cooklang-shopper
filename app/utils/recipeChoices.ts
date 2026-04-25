import type { RecipeChoices } from "@tmlmt/cooklang-parser";
import type { RecipeChoicesWire } from "~~/shared/types";

export function serializeRecipeChoices(
  choices?: RecipeChoices,
): RecipeChoicesWire | undefined {
  if (!choices) return undefined;
  return {
    ingredientItems: [
      ...(choices.ingredientItems ?? new Map<string, number>()).entries(),
    ],
    ingredientGroups: [
      ...(choices.ingredientGroups ?? new Map<string, number>()).entries(),
    ],
    variant: choices.variant,
  };
}

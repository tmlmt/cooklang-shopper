import type { RecipeChoices } from "@tmlmt/cooklang-parser";
import type { RecipeChoicesWire } from "../types";

export function toRecipeChoices(wire: RecipeChoicesWire): RecipeChoices {
  return {
    ingredientItems: new Map(wire.ingredientItems),
    ingredientGroups: new Map(wire.ingredientGroups),
    variant: wire.variant,
  };
}

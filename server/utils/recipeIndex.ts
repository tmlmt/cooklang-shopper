import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeIndex } from "~~/types";

const recipeIndex = new Map<string, RecipeIndex[number]>();

export function getRecipeIndex() {
  return recipeIndex;
}

export async function initRecipeIndex() {
  const storage = useStorage("recipes");
  const keys = await storage.getKeys();

  for (const key of keys.filter((k) => k.endsWith(".cook"))) {
    const content = await storage.getItem(key);
    if (!content) continue;
    updateRecipeIndex(key, content.toString());
  }
}

export function updateRecipeIndex(key: string, content: string) {
  const parsed = new Recipe(content);
  const keyAsPath = key.replace(":", "/");
  let name = keyAsPath.split("/").pop()!;
  if (name.endsWith(".cook")) {
    name = name.substring(0, name.length - 5);
  }
  const recipeKey = key.endsWith(".cook")
    ? key.substring(0, key.length - 5)
    : key;
  recipeIndex.set(recipeKey, {
    name,
    title: parsed.metadata.title || name,
    dir: keyAsPath.split("/").slice(0, -1).join("/"),
    servings: parsed.servings ?? 1,
    tags: parsed.metadata.tags || [],
  });
}

export function deleteFromRecipeIndex(key: string) {
  const recipeKey = key.endsWith(".cook")
    ? key.substring(0, key.length - 5)
    : key;
  recipeIndex.delete(recipeKey);
}

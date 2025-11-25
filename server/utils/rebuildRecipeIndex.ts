import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeIndex } from "~~/types";

export async function rebuildRecipeIndex() {
  const storage = useStorage("recipes");
  const keys = await storage.getKeys();
  const recipes: RecipeIndex = {};

  for (const key of keys.filter((k) => k.endsWith(".cook"))) {
    const content = await storage.getItem(key);
    if (!content) continue;
    const parsed = new Recipe(content.toString());
    const keyAsPath = key.replace(":", "/");
    const name = keyAsPath.split("/").pop()!.replace(".cook", "");
    recipes[key.substring(0, key.length - 5)] = {
      name,
      title: parsed.metadata.title || name,
      dir: keyAsPath.split("/").slice(0, -1).join("/"),
      servings: parsed.servings ?? 1,
      tags: parsed.metadata.tags || [],
    };
  }

  await storage.setItem("index.json", { recipes });
}

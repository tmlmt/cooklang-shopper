import type { RecipeIndex } from "~~/types";

export default defineEventHandler(async () => {
  const storage = useStorage("recipes");
  const index = (await storage.getItem("index.json")) as
    | { recipes: RecipeIndex }
    | undefined;

  if (!index) {
    // Create index on first load
    await rebuildRecipeIndex();
    return (await storage.getItem("index.json")) as
      | { recipes: RecipeIndex }
      | undefined;
  }

  return index;
});

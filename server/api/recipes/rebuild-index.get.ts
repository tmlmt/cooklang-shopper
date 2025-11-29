import type { RecipeIndex } from "~~/types";

export default defineEventHandler(async () => {
  const storage = useStorage("recipes");
  await rebuildRecipeIndex();
  return (await storage.getItem("index.json")) as
    | { recipes: RecipeIndex }
    | undefined;
});

import {
  deleteFromRecipeIndex,
  getRecipeIndex,
} from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const decodedPath = getValidatedRecipePath(event);

  const storage = useStorage("recipes");

  // Remove the recipe file itself
  const recipeKey = decodedPath.replace(/\//g, ":");
  await storage.removeItem(recipeKey + ".cook");

  // Remove the recipe from the index
  deleteFromRecipeIndex(recipeKey);

  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});

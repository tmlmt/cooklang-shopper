import {
  deleteFromRecipeIndex,
  getRecipeIndex,
} from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");
  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: "No recipe path was provided",
    });
  }
  if (!/^(?!\/)(?:[\p{L}\p{N}_ +%.-]+\/)*[\p{L}\p{N}_ +%.-]+$/u.test(path)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid recipe path",
    });
  }

  // Allow for urls to be written with "+" sign instead of space
  const decodedPath = decodeURIComponent(path).replace("+", " ");

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

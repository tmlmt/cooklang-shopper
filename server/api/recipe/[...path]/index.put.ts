import { updateRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");
  // Validating incoming value
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
  const decodedPath = decodeURIComponent(path);

  // Checking whether a recipe body was provided
  const body = await readBody(event);
  if (!body.recipe || body.recipe.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No recipe or empty recipe was provided",
    });
  }

  // Saving
  const storage = useStorage("recipes");
  const recipeKey = decodedPath.replace(/\//g, ":");
  await storage.setItem(recipeKey + ".cook", body.recipe.trim());

  // Update index entry
  updateRecipeIndex(recipeKey, body.recipe.trim());

  return "Recipe saved";
});

import { updateRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const decodedPath = getValidatedRecipePath(event);

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
  await updateRecipeIndex(recipeKey, body.recipe.trim());

  return "Recipe saved";
});

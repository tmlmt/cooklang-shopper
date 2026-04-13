import { isRecipePublic } from "~~/server/utils/recipeVisibility";

export default defineEventHandler(async (event) => {
  const authenticated = await isAuthenticated(event);
  const decodedPath = getValidatedRecipePath(event);
  const recipeKey = decodedPath.replace(/\//g, ":");

  if (!authenticated) {
    const isPublic = await isRecipePublic(recipeKey);
    if (!isPublic) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
  }

  const storage = useStorage("recipes");
  const content = await storage.getItem(decodedPath + ".cook");

  if (!content) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  return content as string;
});

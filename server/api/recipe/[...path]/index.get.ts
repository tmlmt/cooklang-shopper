export default defineEventHandler(async (event) => {
  const authenticated = await isAuthenticated(event);
  const decodedPath = getValidatedRecipePath(event);
  const recipeKey = decodedPath.replace(/\//g, ":");

  if (!authenticated) {
    const isPublic = await isRecipePublic(recipeKey);
    if (!isPublic) {
      throw createError({ status: 401, statusText: "Unauthorized" });
    }
  }

  const storage = useStorage("recipes");
  const content = await storage.getItem(decodedPath + ".cook");

  if (!content) {
    throw createError({
      status: 404,
      statusText: "Recipe not found",
    });
  }

  return content as string;
});

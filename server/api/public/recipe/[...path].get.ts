export default defineEventHandler(async (event) => {
  const path = getValidatedRecipePath(event);
  const recipeKey = path.replace(/\//g, ":");
  const isPublic = await isRecipePublic(recipeKey);

  if (!isPublic) {
    throw createError({ status: 404, statusText: "Not found" });
  }

  const storage = useStorage("recipes");
  const content = await storage.getItem(`${path}.cook`);

  if (!content) {
    throw createError({ status: 404, statusText: "Recipe not found" });
  }

  setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
  return String(content);
});

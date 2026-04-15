export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: "Path is required" });
  }

  const recipeKey = path.replace(/\//g, ":");
  const isPublic = await isRecipePublic(recipeKey);

  if (!isPublic) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const storage = useStorage("recipes");
  const content = await storage.getItem(`${path}.cook`);

  if (!content) {
    throw createError({ statusCode: 404, statusMessage: "Recipe not found" });
  }

  setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
  return String(content);
});

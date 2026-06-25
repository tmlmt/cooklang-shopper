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

  const query = getQuery(event);
  const requestedLocale =
    typeof query.locale === "string" && isValidLangCode(query.locale)
      ? query.locale
      : undefined;

  const fileKey = await selectRecipeFileKey(recipeKey, requestedLocale);

  if (!fileKey) {
    throw createError({
      status: 404,
      statusText: "Recipe not found",
    });
  }

  const storage = useStorage("recipes");
  const content = await storage.getItem(fileKey + ".cook");

  if (!content) {
    throw createError({
      status: 404,
      statusText: "Recipe not found",
    });
  }

  // Tell the client which language variant was served
  const { langCode } = parseRecipeKey(fileKey);
  if (langCode) {
    setResponseHeader(event, "x-recipe-locale", langCode);
  }

  return content as string;
});

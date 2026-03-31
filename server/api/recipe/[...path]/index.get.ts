export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const decodedPath = getValidatedRecipePath(event);

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

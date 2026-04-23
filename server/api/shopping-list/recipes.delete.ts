interface RemoveRecipeBody {
  path: string;
}

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<RemoveRecipeBody>(event);

  if (!body.path || typeof body.path !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "path is required",
    });
  }
  validateRecipePath(body.path);

  await removeRecipeFromList(userKey, body.path);
  return getShoppingListData(userKey);
});

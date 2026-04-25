interface RemoveRecipeBody {
  path: string;
}

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined;
  let userKey: string;
  let listName: string;

  if (token) {
    await requireUserSession(event);
    const ctx = await resolveShoppingShareToken(token);
    userKey = ctx.userKey;
    listName = ctx.listName;
  } else {
    const session = await requireShoppingAccess(event);
    userKey = getUserKey(session);
    listName = "";
  }

  const body = await readBody<RemoveRecipeBody>(event);

  if (!body.path || typeof body.path !== "string") {
    throw createError({
      status: 400,
      statusText: "path is required",
    });
  }
  validateRecipePath(body.path);

  await removeRecipeFromList(userKey, body.path, listName);
  return getShoppingListData(userKey, listName);
});

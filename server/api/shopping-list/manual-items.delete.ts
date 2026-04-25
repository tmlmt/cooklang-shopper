interface RemoveManualItemBody {
  index: number;
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

  const body = await readBody<RemoveManualItemBody>(event);

  if (typeof body.index !== "number" || body.index < 0) {
    throw createError({
      status: 400,
      statusText: "index must be a non-negative number",
    });
  }

  await removeManualItem(userKey, body.index, listName);
  return getShoppingListData(userKey, listName);
});

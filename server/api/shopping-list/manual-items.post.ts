interface AddManualItemBody {
  name: string;
  quantity?: string;
  unit?: string;
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

  const body = await readBody<AddManualItemBody>(event);

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    throw createError({
      status: 400,
      statusText: "name is required",
    });
  }

  if (body.quantity !== undefined && typeof body.quantity !== "string") {
    throw createError({
      status: 400,
      statusText: "quantity must be a string or number",
    });
  }

  if (body.unit !== undefined && typeof body.unit !== "string") {
    throw createError({
      status: 400,
      statusText: "unit must be a string",
    });
  }

  await addManualItem(
    userKey,
    body.name.trim(),
    body.quantity?.trim() || undefined,
    body.unit?.trim() || undefined,
    listName,
  );
  return getShoppingListData(userKey, listName);
});

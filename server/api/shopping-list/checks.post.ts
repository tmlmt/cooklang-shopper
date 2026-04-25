interface CheckBody {
  ingredientName: string;
  checked: boolean;
}

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined;
  let userKey: string;
  let listName: string;

  if (token) {
    const ctx = await resolveShoppingShareToken(token);
    userKey = ctx.userKey;
    listName = ctx.listName;
  } else {
    const session = await requireShoppingAccess(event);
    userKey = getUserKey(session);
    listName = "";
  }

  const body = await readBody<CheckBody>(event);

  if (!body.ingredientName || typeof body.ingredientName !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "ingredientName is required",
    });
  }
  if (typeof body.checked !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "checked must be a boolean",
    });
  }

  await checkIngredient(userKey, body.ingredientName, body.checked, listName);
  return getShoppingListData(userKey, listName);
});

interface CheckBody {
  ingredientName: string;
  checked: boolean;
}

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

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

  await checkIngredient(userKey, body.ingredientName, body.checked);
  return getShoppingListData(userKey);
});

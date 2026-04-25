export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const { userKey, listName, ownerName, expiresAt } =
    await resolveShoppingShareToken(token);
  const data = getShoppingListData(userKey, listName);

  return { ...data, ownerName, expiresAt };
});

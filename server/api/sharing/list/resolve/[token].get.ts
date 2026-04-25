export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({ status: 400, statusText: "Token is required" });
  }

  const { userKey, listName, ownerName, expiresAt } =
    await resolveShoppingShareToken(token);
  const data = getShoppingListData(userKey, listName);

  return { ...data, ownerName, expiresAt };
});

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  await clearList(userKey);
  return getShoppingListData(userKey);
});

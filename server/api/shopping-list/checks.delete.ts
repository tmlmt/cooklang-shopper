export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  await uncheckAll(userKey);
  return getShoppingListData(userKey);
});

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);
  const shoppingData = await getShoppingListData(userKey);
  return shoppingData;
});

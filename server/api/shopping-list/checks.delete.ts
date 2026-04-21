import { getUserKey } from "~~/server/utils/auth";
import { uncheckAll, getShoppingListData } from "~~/server/utils/shoppingIndex";

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  await uncheckAll(userKey);
  return getShoppingListData(userKey);
});

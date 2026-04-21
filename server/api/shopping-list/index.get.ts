import { getUserKey } from "~~/server/utils/auth";
import { getShoppingListData } from "~~/server/utils/shoppingIndex";

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);
  return getShoppingListData(userKey);
});

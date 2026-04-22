import { getUserKey } from "~~/server/utils/auth";
import {
  removeManualItem,
  getShoppingListData,
} from "~~/server/utils/shoppingIndex";

interface RemoveManualItemBody {
  index: number;
}

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<RemoveManualItemBody>(event);

  if (typeof body.index !== "number" || body.index < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "index must be a non-negative number",
    });
  }

  await removeManualItem(userKey, body.index);
  return getShoppingListData(userKey);
});

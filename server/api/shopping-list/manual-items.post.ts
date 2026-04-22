import { getUserKey } from "~~/server/utils/auth";
import {
  addManualItem,
  getShoppingListData,
} from "~~/server/utils/shoppingIndex";

interface AddManualItemBody {
  name: string;
  quantity?: string;
  unit?: string;
}

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<AddManualItemBody>(event);

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "name is required",
    });
  }

  if (body.quantity !== undefined && typeof body.quantity !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "quantity must be a string or number",
    });
  }

  if (body.unit !== undefined && typeof body.unit !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "unit must be a string",
    });
  }

  await addManualItem(
    userKey,
    body.name.trim(),
    body.quantity?.trim() || undefined,
    body.unit?.trim() || undefined,
  );
  return getShoppingListData(userKey);
});

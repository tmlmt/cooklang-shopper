import { clearCart } from "#server/utils/onlineStore/service";
import { defineEventHandler } from "nuxt/server";

export default defineEventHandler(async (event) => {
  const session = await requireCartAccess(event);
  const userKey = getUserKey(session);
  return clearCart(userKey);
});

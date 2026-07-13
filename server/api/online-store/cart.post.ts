import { syncCart } from "#server/utils/onlineStore/service";
import type { OnlineStoreItem } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  const session = await requireCartAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<{ items?: OnlineStoreItem[] }>(event);
  const items = Array.isArray(body?.items) ? body.items : [];

  const sanitized: OnlineStoreItem[] = items
    .filter(
      (i): i is OnlineStoreItem =>
        typeof i?.productId === "string" && typeof i?.quantity === "number",
    )
    .map((i) => ({ productId: i.productId, quantity: i.quantity }));

  return syncCart(userKey, sanitized);
});

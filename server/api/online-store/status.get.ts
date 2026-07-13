import { getStoreStatus } from "#server/utils/onlineStore/service";

export default defineEventHandler(async (event) => {
  const session = await requireCartAccess(event);
  const userKey = getUserKey(session);
  return getStoreStatus(userKey);
});

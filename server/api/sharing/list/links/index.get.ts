export default defineEventHandler(async (event) => {
  await requireEditorRole(event);
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);

  const db = getDb();
  const links = await db.shoppingListShareLink.findMany({
    where: { userKey, listName: "" },
    orderBy: { createdAt: "desc" },
  });

  return links.map((link) => ({
    id: link.id,
    token: link.token,
    ownerName: link.ownerName,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    expired: link.expiresAt ? link.expiresAt < new Date() : false,
  }));
});

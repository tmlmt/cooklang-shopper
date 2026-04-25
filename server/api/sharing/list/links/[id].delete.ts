export default defineEventHandler(async (event) => {
  await requireEditorRole(event);
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);

  const id = getRouterParam(event, "id");
  if (!id || isNaN(Number(id))) {
    throw createError({
      status: 400,
      statusText: "Valid link ID is required",
    });
  }

  const db = getDb();

  const link = await db.shoppingListShareLink.findUnique({
    where: { id: Number(id) },
  });
  if (!link) {
    throw createError({
      status: 404,
      statusText: "Share link not found",
    });
  }
  if (link.userKey !== userKey) {
    throw createError({ status: 403, statusText: "Forbidden" });
  }

  await db.shoppingListShareLink.delete({ where: { id: Number(id) } });

  return { success: true };
});

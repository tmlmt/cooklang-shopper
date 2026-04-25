export default defineEventHandler(async (event) => {
  await requireEditorRole(event);
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);

  const id = getRouterParam(event, "id");
  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid link ID is required",
    });
  }

  const db = getDb();

  const link = await db.shoppingListShareLink.findUnique({
    where: { id: Number(id) },
  });
  if (!link) {
    throw createError({
      statusCode: 404,
      statusMessage: "Share link not found",
    });
  }
  if (link.userKey !== userKey) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  await db.shoppingListShareLink.delete({ where: { id: Number(id) } });

  return { success: true };
});

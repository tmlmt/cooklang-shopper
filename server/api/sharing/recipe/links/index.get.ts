export default defineEventHandler(async (event) => {
  await requireSharePermission(event);

  const query = getQuery(event);
  const recipePath = query.recipePath as string | undefined;
  if (!recipePath) {
    throw createError({
      statusCode: 400,
      statusMessage: "Recipe path is required",
    });
  }

  const db = getDb();
  const links = await db.shareLink.findMany({
    where: { recipePath },
    orderBy: { createdAt: "desc" },
  });

  return links.map((link) => ({
    id: link.id,
    token: link.token,
    recipePath: link.recipePath,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    expired: link.expiresAt ? link.expiresAt < new Date() : false,
  }));
});

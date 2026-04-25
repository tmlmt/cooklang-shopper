export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const id = getRouterParam(event, "id");
  if (!id || isNaN(Number(id))) {
    throw createError({
      status: 400,
      statusText: "Valid link ID is required",
    });
  }

  const db = getDb();
  try {
    await db.shareLink.delete({
      where: { id: Number(id) },
    });
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && e.code === "P2025") {
      throw createError({
        status: 404,
        statusText: "Share link not found",
      });
    }
    throw e;
  }

  return { success: true };
});

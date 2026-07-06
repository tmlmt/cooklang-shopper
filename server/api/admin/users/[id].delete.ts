export default defineEventHandler(async (event) => {
  await requireAdminRole(event);

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id)) {
    throw createError({ status: 400, message: "Invalid user id" });
  }

  const db = getDb();
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    throw createError({ status: 404, message: "User not found" });
  }

  await assertNotLastAdmin(id);

  // Identities and invitations cascade-delete via the schema relations.
  await db.user.delete({ where: { id } });

  return { ok: true };
});

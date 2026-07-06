export default defineEventHandler(async (event) => {
  await requireAdminRole(event);

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id)) {
    throw createError({ status: 400, message: "Invalid user id" });
  }

  const db = getDb();
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    throw createError({ status: 404, message: "User not found" });
  }
  if (user.status === "active") {
    throw createError({
      status: 409,
      message: "User has already claimed their account",
    });
  }

  const token = await createInvitation(id);
  const inviteUrl = await buildInviteUrl(token);
  const emailed = await sendInvitationEmail(event, user.email, inviteUrl);

  return { inviteUrl, emailed };
});

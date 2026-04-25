import { randomUUID } from "node:crypto";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);
  const ownerName = session.user.profile;

  const body = await readBody<{ expiresAt?: string }>(event);

  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid expiresAt date",
      });
    }
    if (expiresAt <= new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: "expiresAt must be in the future",
      });
    }
  }

  const token = randomUUID();
  const db = getDb();

  const link = await db.shoppingListShareLink.create({
    data: { token, userKey, listName: "", ownerName, expiresAt },
  });

  return {
    id: link.id,
    token: link.token,
    ownerName: link.ownerName,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
  };
});

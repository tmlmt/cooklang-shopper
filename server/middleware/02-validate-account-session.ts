import { ACCOUNT_PROVIDER } from "#server/utils/appConfig";

/**
 * For sessions backed by the DB user directory (provider === "account"),
 * verify the user still exists and is active on every request.
 * This ensures that deleting or deactivating a user immediately revokes
 * their session, even before their cookie expires.
 *
 * Password and generic OIDC sessions are stateless and cannot be checked
 * this way — rotate `sessionSecret` in config.yaml to invalidate all of them.
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (session.user?.provider !== ACCOUNT_PROVIDER) {
    return;
  }

  const userId = Number(session.user.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    await clearUserSession(event);
    throw createError({ status: 401, message: "Invalid session" });
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  if (!user || user.status !== "active") {
    await clearUserSession(event);
    throw createError({ status: 401, message: "Session is no longer valid" });
  }
});

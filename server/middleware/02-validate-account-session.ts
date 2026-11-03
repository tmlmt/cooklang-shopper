import { ACCOUNT_PROVIDER } from "#server/utils/appConfig";
import { defineEventHandler } from "nuxt/server";

/**
 * For sessions backed by the DB user directory (provider === "account"),
 * verify the user still exists and is active on every request, and keep the
 * session role in sync with the database.
 * This ensures that deleting or deactivating a user immediately revokes
 * their session, and role changes take effect on the next request.
 *
 * Password and generic OIDC sessions are stateless and cannot be checked
 * this way — rotate `NUXT_APP_SECRET` in your .env file to invalidate all of them.
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
    select: { status: true, role: true },
  });

  if (!user || user.status !== "active") {
    await clearUserSession(event);
    throw createError({ status: 401, message: "Session is no longer valid" });
  }

  if (!isRole(user.role)) {
    throw createError({ status: 500, message: "Invalid account role" });
  }

  // Update the session if the user's role has changed in the database.
  const updatedUser =
    session.user.role === user.role
      ? null
      : { ...session.user, role: user.role };
  if (updatedUser) {
    await setUserSession(event, { user: updatedUser });
  }
});

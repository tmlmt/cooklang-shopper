import type { H3Event } from "h3";
import type { UserSession } from "#auth-utils";
import { getAppConfig } from "#server/utils/appConfig";

/**
 * Require that the current user has access to shopping features.
 * Returns the validated session so callers can extract the user key.
 */
export async function requireShoppingAccess(
  event: H3Event,
): Promise<UserSession> {
  const session = await requireUserSession(event);
  const config = await getAppConfig();
  const enabled = config.shopping?.enabled ?? false;

  if (!enabled) {
    throw createError({ statusCode: 403, message: "Shopping is disabled" });
  }

  if (enabled === "editor-only" && session.user.role !== "editor") {
    throw createError({
      statusCode: 403,
      message: "Shopping is restricted to editors",
    });
  }

  return session;
}

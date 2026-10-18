import type { UserSession } from "#auth-utils";
import { getAppConfig } from "#server/utils/appConfig";
import type { RequestEvent } from "nuxt/server";
import type { H3Event } from "h3";

/**
 * Require that the current user has access to shopping features.
 * Returns the validated session so callers can extract the user key.
 */
export async function requireShoppingAccess(
  event: RequestEvent | H3Event,
): Promise<UserSession> {
  const session = await requireUserSession(event);
  const config = await getAppConfig();
  const enabled = config.shopping?.enabled ?? false;

  if (!enabled) {
    throw createError({ status: 403, message: "Shopping is disabled" });
  }

  if (enabled === "editor-only" && !hasEditorAccess(session.user.role)) {
    throw createError({
      status: 403,
      message: "Shopping is restricted to editors",
    });
  }

  return session;
}

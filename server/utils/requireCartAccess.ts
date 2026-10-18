import type { UserSession } from "#auth-utils";
import type { RequestEvent } from "nuxt/server";
import { getAppConfig } from "#server/utils/appConfig";

/**
 * Require that the current user has access to the shopping cart features
 * (catalog + online store). Mirrors {@link requireShoppingAccess} but gates on
 * `cart.enabled`.
 */
export async function requireCartAccess(
  event: RequestEvent,
): Promise<UserSession> {
  const session = await requireUserSession(event);
  const config = await getAppConfig();
  const enabled = config.cart?.enabled ?? false;

  if (!enabled) {
    throw createError({ status: 403, message: "Cart is disabled" });
  }

  if (enabled === "editor-only" && !hasEditorAccess(session.user.role)) {
    throw createError({
      status: 403,
      message: "Cart is restricted to editors",
    });
  }

  return session;
}

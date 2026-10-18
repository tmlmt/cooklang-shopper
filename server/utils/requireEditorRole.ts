import type { RequestEvent } from "nuxt/server";
import { getAppConfig } from "#server/utils/appConfig";
import type { H3Event } from "h3";

export async function requireEditorRole(
  event: RequestEvent | H3Event,
): Promise<void> {
  const session = await requireUserSession(event);
  if (!hasEditorAccess(session.user.role)) {
    throw createError({
      status: 403,
      message: "Editor role required",
    });
  }
}

export async function requireAdminRole(
  event: RequestEvent | H3Event,
): Promise<void> {
  const session = await requireUserSession(event);
  if (!hasAdminAccess(session.user.role)) {
    throw createError({
      status: 403,
      message: "Admin role required",
    });
  }
}

export async function requireSharePermission(
  event: RequestEvent | H3Event,
): Promise<void> {
  const session = await requireUserSession(event);
  if (session.user.role === "editor") return;
  if (session.user.role === "admin") return;

  const config = await getAppConfig();
  if (!config.sharing?.viewerCanShare) {
    throw createError({
      status: 403,
      message: "Sharing permission required",
    });
  }
}

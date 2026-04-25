import type { H3Event } from "h3";
import { getAppConfig } from "#server/utils/appConfig";

export async function requireEditorRole(event: H3Event): Promise<void> {
  const session = await requireUserSession(event);
  if (session.user.role !== "editor") {
    throw createError({
      status: 403,
      message: "Editor role required",
    });
  }
}

export async function requireSharePermission(event: H3Event): Promise<void> {
  const session = await requireUserSession(event);
  if (session.user.role === "editor") return;

  const config = await getAppConfig();
  if (!config.sharing?.viewerCanShare) {
    throw createError({
      status: 403,
      message: "Sharing permission required",
    });
  }
}

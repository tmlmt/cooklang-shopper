import type { H3Event } from "h3";
import type { UserSession } from "#auth-utils";

/**
 * Check if the request has a valid user session without throwing an error.
 * Returns true if authenticated, false otherwise.
 */
export async function isAuthenticated(event: H3Event): Promise<boolean> {
  try {
    await requireUserSession(event);
    return true;
  } catch {
    return false;
  }
}

/** Sanitize a string for use in dotfile names: replace dots with underscores */
function sanitize(s: string): string {
  return s.replace(/\./g, "_");
}

export function getUserKey(session: UserSession): string {
  if (!session.user) {
    throw createError({ status: 401, statusText: "Not authenticated" });
  }
  return `${sanitize(session.user.provider)}-${sanitize(session.user.userId)}`;
}

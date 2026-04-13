import type { H3Event } from "h3";

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

import type { Role } from "~~/shared/types";

/**
 * Whether a role can perform editor actions.
 * Admins are a superset of editors.
 */
export function hasEditorAccess(role: Role | undefined | null): boolean {
  return role === "editor" || role === "admin";
}

/** Whether a role has admin privileges. */
export function hasAdminAccess(role: Role | undefined | null): boolean {
  return role === "admin";
}

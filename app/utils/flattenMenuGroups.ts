import type { DropdownMenuItem } from "@nuxt/ui";

/**
 * Flattens an array of menu item groups into a single array,
 * inserting `{ type: "separator" }` between non-empty groups.
 * Suitable for UDropdownMenu which handles separator items natively.
 */
export function flattenMenuGroups(
  groups: DropdownMenuItem[][],
): DropdownMenuItem[] {
  const result: DropdownMenuItem[] = [];
  for (const group of groups) {
    if (group.length === 0) continue;
    if (result.length > 0) result.push({ type: "separator" });
    result.push(...group);
  }
  return result;
}

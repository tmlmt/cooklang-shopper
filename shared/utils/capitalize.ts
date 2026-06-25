/**
 * Capitalize first letter of a string
 * @param value string to capitalize
 * @returns string with first letter capitalized
 */

export function capitalize<T extends string | undefined>(
  value: T,
): T extends string ? string : undefined {
  if (!value) return value as never;
  return (value.charAt(0).toUpperCase() + value.slice(1)) as never;
}

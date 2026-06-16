/**
 * Capitalize first letter of a string
 * @param value string to capitalize
 * @returns string with first letter capitalized
 */
export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

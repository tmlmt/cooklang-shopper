/**
 * Format a time value (in minutes) to a human-readable string.
 * If the value is a string, return it as-is.
 * If undefined, return the fallback.
 */
export function formatTime(
  value: number | string | undefined,
  fallback = "-",
): string {
  if (value === undefined) return fallback;
  if (typeof value === "string") return value;

  const days = Math.floor(value / 1440);
  const hours = Math.floor((value % 1440) / 60);
  const minutes = Math.round(value % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);

  return parts.join(" ");
}

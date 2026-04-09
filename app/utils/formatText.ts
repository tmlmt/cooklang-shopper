import type { MetadataDisplayValue } from "#shared/types";
import { urlRegex } from "#shared/regex";

export const formatAsText = (val: unknown): string => {
  if (val === undefined || val === null) return "";
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(formatAsText).join(", ");
  if (typeof val === "object")
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${formatAsText(v)}`)
      .join(", ");
  return String(val);
};

export const maybeDetectURLinText = (
  value: unknown,
  detectUrls = false,
): MetadataDisplayValue => {
  const text =
    typeof value === "object" && value !== null
      ? formatAsText(value)
      : String(value);
  if (detectUrls) {
    const trimmed = text.trim();
    if (trimmed && urlRegex.test(trimmed)) {
      return { text, href: trimmed };
    }
  }
  return { text };
};

/**
 * Returns true if the given string is a valid ISO-639-1-like language code:
 * exactly 2 lowercase ASCII letters (e.g. "en", "fr", "de").
 */
export function isValidLangCode(code: string): boolean {
  return /^[a-z]{2}$/.test(code);
}

/**
 * Parses a recipe key (without the .cook extension) into its base key and
 * optional language code.
 *
 * Works with both colon-separated Nitro storage keys and slash-separated paths,
 * preserving the separator style of the input.
 *
 * Examples:
 *   "italian:pasta.en"  → { baseKey: "italian:pasta", langCode: "en" }
 *   "italian/pasta.en"  → { baseKey: "italian/pasta", langCode: "en" }
 *   "italian:pasta"     → { baseKey: "italian:pasta", langCode: undefined }
 *   "pasta.en"          → { baseKey: "pasta",         langCode: "en" }
 *   "pasta"             → { baseKey: "pasta",          langCode: undefined }
 */
export function parseRecipeKey(keyWithoutCook: string): {
  baseKey: string;
  langCode: string | undefined;
} {
  const lastSepIdx = Math.max(
    keyWithoutCook.lastIndexOf(":"),
    keyWithoutCook.lastIndexOf("/"),
  );
  const lastSegment =
    lastSepIdx === -1 ? keyWithoutCook : keyWithoutCook.slice(lastSepIdx + 1);
  const prefix =
    lastSepIdx === -1 ? "" : keyWithoutCook.slice(0, lastSepIdx + 1);

  const dotIdx = lastSegment.lastIndexOf(".");
  if (dotIdx !== -1) {
    const potentialCode = lastSegment.slice(dotIdx + 1);
    if (isValidLangCode(potentialCode)) {
      return {
        baseKey: prefix + lastSegment.slice(0, dotIdx),
        langCode: potentialCode,
      };
    }
  }

  return { baseKey: keyWithoutCook, langCode: undefined };
}

/**
 * Extracts the `locale` metadata key from a parsed recipe's metadata if it is
 * a valid 2-letter language code. Returns undefined otherwise.
 */
export function extractLocaleFromMetadata(
  metadata: Record<string, unknown>,
): string | undefined {
  const locale = metadata.locale;
  if (typeof locale === "string" && isValidLangCode(locale)) {
    return locale;
  }
  return undefined;
}

/**
 * Builds the full file key (without .cook) from a base key and an optional
 * language code.
 *
 * Examples:
 *   ("italian:pasta", "en")    → "italian:pasta.en"
 *   ("italian:pasta", undefined) → "italian:pasta"
 */
export function buildFileKey(baseKey: string, langCode?: string): string {
  return langCode ? `${baseKey}.${langCode}` : baseKey;
}

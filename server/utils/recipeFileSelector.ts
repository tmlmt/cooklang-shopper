import { useStorage } from "nitropack/runtime/storage";

/**
 * Selects the best recipe file key to serve for a given base key, using the
 * priority order:
 *   1. Default file (no language code): {baseKey}.cook
 *   2. File matching the requested locale: {baseKey}.{locale}.cook
 *   3. First alphabetically among available language variants
 *
 * Returns the full file key without the .cook extension (e.g. "pasta" or
 * "pasta.en"), or null if no file exists at all.
 */
export async function selectRecipeFileKey(
  baseKey: string,
  requestedLocale?: string,
): Promise<string | null> {
  const storage = useStorage("recipes");

  // Gather available language variants from the index
  const { getVariantsForBase } = await import("~~/server/utils/recipeIndex");
  const { hasDefault, langCodes } = getVariantsForBase(baseKey);

  // 1. If a specific locale was requested, serve it (preferred over default)
  if (requestedLocale && langCodes.includes(requestedLocale)) {
    return `${baseKey}.${requestedLocale}`;
  }

  // 2. Default file (no lang code)
  if (hasDefault) return baseKey;

  if (langCodes.length === 0) {
    // No entry in index yet (e.g. freshly written file); fall back to storage check
    const exists = await storage.hasItem(baseKey + ".cook");
    return exists ? baseKey : null;
  }

  // 3. First alphabetically among available language variants
  return `${baseKey}.${langCodes[0]!}`;
}

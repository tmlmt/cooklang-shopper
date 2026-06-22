import { Recipe } from "@tmlmt/cooklang-parser";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { RecipeIndex } from "~~/shared/types";
import { getAppConfig } from "#server/utils/appConfig";

const recipeIndex = new Map<string, RecipeIndex[number]>();

/**
 * Tracks which file variants exist for each base key.
 * baseKey → { hasDefault: boolean; langCodes: Set<string> }
 *
 * "hasDefault" means a {name}.cook file (no lang code) exists.
 * "langCodes" contains all {name}.xx.cook language-code suffixes.
 */
const variantTracker = new Map<
  string,
  { hasDefault: boolean; langCodes: Set<string> }
>();

export function getRecipeIndex() {
  return recipeIndex;
}

/**
 * Returns the variant information for a base key, for use by move/delete
 * endpoints that need to operate on all language files atomically.
 */
export function getVariantsForBase(baseKey: string): {
  hasDefault: boolean;
  langCodes: string[];
} {
  const tracker = variantTracker.get(baseKey);
  if (!tracker) return { hasDefault: false, langCodes: [] };
  return {
    hasDefault: tracker.hasDefault,
    langCodes: Array.from(tracker.langCodes).sort(),
  };
}

/**
 * Resolves the configured default locale for recipe files.
 * Prefers runtimeConfig (set by 03-i18n-config from config.yaml) over a
 * direct getAppConfig() read, falling back to the latter if not set.
 */
const resolveConfigDefaultLocale = async (): Promise<string | undefined> => {
  const runtimeDefault = useRuntimeConfig().public.i18nRuntime.defaultLocale;
  if (runtimeDefault) return runtimeDefault;
  const config = await getAppConfig();
  return config.i18n?.defaultLocale;
};

export async function initRecipeIndex() {
  recipeIndex.clear();
  variantTracker.clear();

  const configDefaultLocale = await resolveConfigDefaultLocale();

  const storage = useStorage("recipes");
  const keys = await storage.getKeys();
  const cookKeys = keys.filter((k: string) => k.endsWith(".cook"));

  // Group file keys by base key (strips lang code and .cook extension)
  const groups = new Map<
    string,
    { fileKey: string; langCode: string | undefined }[]
  >();
  for (const key of cookKeys) {
    const withoutExt = key.substring(0, key.length - 5); // strip .cook
    const { baseKey, langCode } = parseRecipeKey(withoutExt);
    if (!groups.has(baseKey)) groups.set(baseKey, []);
    groups.get(baseKey)!.push({ fileKey: withoutExt, langCode });
  }

  // Process each group
  for (const [baseKey, variants] of groups) {
    // Sort: default file first (no lang code), then alphabetically by lang code
    variants.sort((a, b) => {
      if (!a.langCode && b.langCode) return -1;
      if (a.langCode && !b.langCode) return 1;
      return (a.langCode ?? "").localeCompare(b.langCode ?? "");
    });

    // Build variant tracker for this base key
    const tracker = { hasDefault: false, langCodes: new Set<string>() };
    for (const { langCode } of variants) {
      if (langCode) tracker.langCodes.add(langCode);
      else tracker.hasDefault = true;
    }
    variantTracker.set(baseKey, tracker);

    // Use the primary variant for metadata:
    // the default file if it exists, otherwise the first alphabetically
    const primary = variants[0]!;
    const primaryContent = await storage.getItem(primary.fileKey + ".cook");
    if (!primaryContent) continue;

    try {
      await buildIndexEntry(
        baseKey,
        primary.fileKey,
        primary.langCode,
        primaryContent.toString(),
        tracker,
        configDefaultLocale,
      );
    } catch (err) {
      console.warn(`Failed to index recipe group "${baseKey}":`, err);
    }
  }
}

function getTimeMetadata(
  metadata: Record<string, unknown>,
):
  | { prep?: number | string; cook?: number | string; total?: number | string }
  | undefined {
  const time = metadata.time as
    | {
        prep?: number | string;
        cook?: number | string;
        total?: number | string;
      }
    | undefined;
  if (!time) return undefined;
  const result: {
    prep?: number | string;
    cook?: number | string;
    total?: number | string;
  } = {};
  if (time.prep !== undefined) result.prep = time.prep;
  if (time.cook !== undefined) result.cook = time.cook;
  if (time.total !== undefined) result.total = time.total;
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Builds and sets a recipe index entry from a parsed file. */
async function buildIndexEntry(
  baseKey: string,
  fileKey: string, // key without .cook
  langCode: string | undefined,
  content: string,
  tracker: { hasDefault: boolean; langCodes: Set<string> },
  configDefaultLocale?: string,
) {
  const parsed = new Recipe(content);
  const fileKeyAsPath = `${fileKey}.cook`.replace(/:/g, "/");
  const baseKeyAsPath = baseKey.replace(/:/g, "/");
  const name = baseKeyAsPath.split("/").pop()!;

  let lastModified: string | undefined;
  try {
    const recipeFsPath = path.join(
      process.cwd(),
      "public",
      "recipes",
      fileKeyAsPath,
    );
    const fileStats = await stat(recipeFsPath);
    lastModified = fileStats.mtime.toISOString();
  } catch {
    // best-effort
  }

  const metadata = parsed.metadata;

  let defaultLocale: string | undefined;
  if (!langCode) {
    // Default file: extract from metadata or fall back to app config
    defaultLocale = extractLocaleFromMetadata(metadata) ?? configDefaultLocale;
  }

  recipeIndex.set(baseKey, {
    name,
    title: parsed.metadata.title || name,
    dir: baseKeyAsPath.split("/").slice(0, -1).join("/"),
    servings: parsed.servings ?? 1,
    tags: parsed.metadata.tags || [],
    lastModified,
    times: getTimeMetadata(metadata),
    author: typeof metadata.author === "string" ? metadata.author : undefined,
    source: typeof metadata.source === "string" ? metadata.source : undefined,
    description:
      typeof metadata.description === "string"
        ? metadata.description
        : typeof metadata.introduction === "string"
          ? metadata.introduction
          : undefined,
    difficulty:
      typeof metadata.difficulty === "string" ? metadata.difficulty : undefined,
    locales: Array.from(tracker.langCodes).sort(),
    defaultLocale,
  });
}

/**
 * Adds or updates an individual recipe file in the index.
 * Called when a recipe is created, edited, or moved.
 *
 * If this is the default file (no lang code) or no entry exists yet,
 * the index metadata is rebuilt from this content. Otherwise only the
 * locales list is updated.
 */
export async function updateRecipeIndex(key: string, content: string) {
  const normalizedKey = key.endsWith(".cook") ? key : `${key}.cook`;
  const keyWithoutExt = normalizedKey.substring(0, normalizedKey.length - 5);
  const { baseKey, langCode } = parseRecipeKey(keyWithoutExt);

  // Update variant tracker
  let tracker = variantTracker.get(baseKey);
  if (!tracker) {
    tracker = { hasDefault: false, langCodes: new Set() };
    variantTracker.set(baseKey, tracker);
  }
  if (langCode) tracker.langCodes.add(langCode);
  else tracker.hasDefault = true;

  const existing = recipeIndex.get(baseKey);
  const shouldRebuildMetadata = !existing || !langCode;

  if (shouldRebuildMetadata) {
    const configDefaultLocale = !langCode
      ? await resolveConfigDefaultLocale()
      : undefined;

    await buildIndexEntry(
      baseKey,
      keyWithoutExt,
      langCode,
      content,
      tracker,
      configDefaultLocale,
    );

    // If a lang variant was the trigger but a prior defaultLocale existed, restore it
    if (langCode && existing?.defaultLocale) {
      const entry = recipeIndex.get(baseKey);
      if (entry)
        recipeIndex.set(baseKey, {
          ...entry,
          defaultLocale: existing.defaultLocale,
        });
    }
  } else {
    // Language variant updated; only refresh the locales list
    recipeIndex.set(baseKey, {
      ...existing!,
      locales: Array.from(tracker.langCodes).sort(),
    });
  }
}

/**
 * Removes one variant of a recipe from the index.
 * The index entry is deleted only when all variants are gone.
 */
export function deleteFromRecipeIndex(key: string) {
  const keyWithoutExt = key.endsWith(".cook")
    ? key.substring(0, key.length - 5)
    : key;
  const { baseKey, langCode } = parseRecipeKey(keyWithoutExt);

  const tracker = variantTracker.get(baseKey);
  if (!tracker) return;

  if (langCode) {
    tracker.langCodes.delete(langCode);
  } else {
    tracker.hasDefault = false;
  }

  if (!tracker.hasDefault && tracker.langCodes.size === 0) {
    variantTracker.delete(baseKey);
    recipeIndex.delete(baseKey);
    return;
  }

  // Update the locales list (and clear defaultLocale if default file was removed)
  const existing = recipeIndex.get(baseKey);
  if (existing) {
    recipeIndex.set(baseKey, {
      ...existing,
      locales: Array.from(tracker.langCodes).sort(),
      ...(langCode ? {} : { defaultLocale: undefined }),
    });
  }
}

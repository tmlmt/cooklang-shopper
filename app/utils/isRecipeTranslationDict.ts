import type { TranslationDict } from "~~/shared/types";

/**
 * Whether a fetched `/_locales/recipe-path/<locale>/data.json` payload is usable
 * as a translation dictionary.
 *
 * A malformed response does not throw: when the body is not parsable JSON,
 * $fetch (destr) falls back to handing back the raw text, so the payload arrives
 * as a plain string. Activating such a payload makes every lookup miss and the
 * page renders raw keys ("recipe.ingredients") instead of labels, so the shape
 * is checked before use — `recipe.ingredients` acts as the sentinel since the
 * recipe pages resolve it through this dictionary.
 */
export function isRecipeTranslationDict(
  value: unknown,
): value is TranslationDict {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const recipe = (value as TranslationDict).recipe;
  if (typeof recipe !== "object" || recipe === null) return false;
  return typeof (recipe as TranslationDict).ingredients === "string";
}

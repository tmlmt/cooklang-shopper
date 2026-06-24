import type { LocaleOption, RecipeEssentials } from "~~/shared/types";

/**
 * Manages the currently-viewed language variant of a recipe.
 *
 * @param indexEntry   the recipe's index entry (carries locales / defaultLocale)
 * @param initialLocale lang code served on SSR (x-recipe-locale header), or
 *                      undefined when the default file was served
 */
export function useRecipeLanguage(
  indexEntry:
    | Ref<RecipeEssentials | undefined>
    | ComputedRef<RecipeEssentials | undefined>,
  initialLocale: string | undefined,
) {
  // The lang code currently being viewed (undefined = default file)
  const currentLocale = ref<string | undefined>(initialLocale);

  /** All language codes available as explicit .xx.cook variant files */
  const variantLocales = computed(() => indexEntry.value?.locales ?? []);

  /** Locale detected for the default file (from metadata or app config) */
  const defaultLocale = computed(() => indexEntry.value?.defaultLocale);

  /**
   * All locale codes the recipe is available in. The default file is the first
   * entry (code: undefined), labelled by its detected locale or "default";
   * remaining entries are the explicit .xx.cook variants.
   */
  const allLocaleOptions = computed(() => {
    const options: LocaleOption[] = [];

    // Default file entry
    const defaultLabel = defaultLocale.value
      ? defaultLocale.value.toUpperCase()
      : "default";
    options.push({ code: undefined, label: defaultLabel });

    // Explicit language variant entries
    for (const code of variantLocales.value) {
      options.push({ code, label: code.toUpperCase() });
    }

    return options;
  });

  /** Whether this recipe has multiple language variants available */
  const isMultilingual = computed(() => variantLocales.value.length > 0);

  function setLocale(code: string | undefined) {
    currentLocale.value = code;
  }

  return {
    currentLocale,
    variantLocales,
    defaultLocale,
    allLocaleOptions,
    isMultilingual,
    setLocale,
  };
}

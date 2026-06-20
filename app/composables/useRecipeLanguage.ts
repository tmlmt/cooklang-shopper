import type { RecipeEssentials } from "~~/shared/types";

/**
 * Manages the currently-viewed language variant of a recipe.
 *
 * `indexEntry`  – the recipe's index entry (carries locales / defaultLocale)
 * `initialLocale` – lang code served on SSR (from x-recipe-locale header), or
 *                   undefined when the default file was served
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
   * Full list of all locale codes the recipe is available in, including the
   * default file represented by its detected locale (if known) or a
   * placeholder "default" label.
   *
   * Shape: Array<{ code: string | undefined; label: string }>
   *  - code: undefined = default file, string = .xx.cook variant
   */
  const allLocaleOptions = computed(() => {
    const options: { code: string | undefined; label: string }[] = [];

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

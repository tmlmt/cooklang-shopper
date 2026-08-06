import type { TranslationDict } from "~~/shared/types";

/**
 * "Page UI language follows the recipe language" feature, shared by the recipe
 * page and the public share-link page.
 *
 * A cookie (`ui:recipe:page-language-mode`, see `useRecipePageLanguageMode`)
 * decides whether the recipe-content UI labels follow the app locale ("app") or
 * the viewed recipe's locale ("recipe"). This composable owns the `recipeT`
 * function injected into the recipe-content components (`recipe/Content.vue`,
 * `IngredientItem.vue`, `PreparationItem.vue`, and `ModalCookMode.vue` via its
 * `translateFunction` prop).
 *
 * Labels are resolved directly from a fetched dictionary — a dot-path walk over
 * the active locale's payload plus `{param}` interpolation — with a per-key
 * fallback to `$ts` (app locale). No library chunk cache / synthetic route is
 * involved, so a missing key or an unusable payload yields an app-language label
 * and never a raw key.
 */
export function useRecipeUiLocale(
  stateKey: string,
  options?: { recipeDefaultLocale?: () => string | undefined },
) {
  const { $ts, $getLocale, $getLocales, $defaultLocale } = useI18n();
  const toast = useToast();
  const availableLocales = useAppLocaleCodes();
  const pageLanguageModeCookie = useRecipePageLanguageMode();

  // Fetched UI-label dictionaries keyed by locale. A `useState` so they ride the
  // SSR payload (no hydration re-fetch, no flash). Shared across recipe/share
  // pages: the `/_locales/recipe-path/<locale>/data.json` payload is identical.
  const recipeUiDicts = useState<Record<string, TranslationDict>>(
    "recipe-ui-translations",
    () => ({}),
  );
  // Which UI locale is active (undefined = follow app locale). Per-key useState so
  // the choice survives hydration without recomputation.
  const activeUiLocale = useState<string | undefined>(
    `recipe-ui-active-locale-${stateKey}`,
    () => undefined,
  );

  type TranslateParams = Parameters<typeof $ts>[1];

  function lookupDotPath(dict: TranslationDict, key: string): unknown {
    let node: unknown = dict;
    for (const segment of key.split(".")) {
      if (typeof node !== "object" || node === null) return undefined;
      node = (node as Record<string, unknown>)[segment];
    }
    return node;
  }

  // nuxt-i18n-micro's own `{param}` interpolation syntax.
  function interpolate(template: string, params: TranslateParams): string {
    if (!params) return template;
    const values = params as Record<string, unknown>;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  }

  // Resolve labels from the active locale's fetched dict, interpolating params,
  // falling back to $ts per key when inactive or missing. Reads reactive state
  // per call, so children re-render when the active locale changes.
  //
  // Plurals: `recipeT` is only used for simple keys. A pipe-delimited plural
  // string would be returned verbatim (no form selection); consumers needing
  // pluralization must use `$tc`. None currently do.
  const recipeT: typeof $ts = (key, params, defaultValue) => {
    const locale = activeUiLocale.value;
    if (!locale) return $ts(key, params, defaultValue);
    const dict = recipeUiDicts.value[locale];
    const value = dict ? lookupDotPath(dict, key) : undefined;
    if (typeof value === "string") return interpolate(value, params);
    return $ts(key, params, defaultValue);
  };
  provide("recipeT", recipeT);

  function clearUiLocale() {
    activeUiLocale.value = undefined;
  }

  // Resolution priority: explicit recipe locale → recipe's default locale →
  // app default locale.
  function resolveTargetUiLocale(recipeLocale: string | undefined) {
    return recipeLocale ?? options?.recipeDefaultLocale?.() ?? $defaultLocale();
  }

  /**
   * Activate UI-label translations for `targetUiLocale` (or follow the app locale
   * when undefined / unavailable). The fetched dictionary is memoised per locale
   * in `recipeUiDicts` (SSR-payload transferred, so the client skips the re-fetch).
   *
   * Returns true when the target locale was activated, false when it fell back to
   * the app locale (no target, unavailable, or unusable payload).
   */
  async function applyRecipeUiLocale(
    targetUiLocale: string | undefined,
  ): Promise<boolean> {
    if (!targetUiLocale || !availableLocales.value.includes(targetUiLocale)) {
      activeUiLocale.value = undefined;
      return false;
    }
    let dict = recipeUiDicts.value[targetUiLocale];
    if (!dict) {
      let fetched: unknown;
      try {
        fetched = await $fetch(
          `/_locales/recipe-path/${targetUiLocale}/data.json`,
        );
      } catch {
        activeUiLocale.value = undefined;
        return false;
      }
      // A malformed payload (truncated body, HTML fallback, …) does not throw —
      // $fetch hands back the raw text — and activating it would make every label
      // render as its raw key. Stay on the app locale instead.
      if (!isRecipeTranslationDict(fetched)) {
        console.warn(
          `[i18n] Unusable translation payload for "${targetUiLocale}"; keeping page labels in the app locale.`,
        );
        activeUiLocale.value = undefined;
        return false;
      }
      dict = fetched;
      recipeUiDicts.value[targetUiLocale] = dict;
    }
    activeUiLocale.value = targetUiLocale;
    return true;
  }

  /**
   * Keep page UI labels aligned with the currently viewed recipe locale when the
   * page is in "same as recipe" mode. Called on load (from the cookie) and after
   * saving an edited variant.
   */
  async function syncPageUiLocale(
    recipeLocale: string | undefined,
  ): Promise<boolean> {
    if (pageLanguageModeCookie.value !== "recipe") {
      activeUiLocale.value = undefined;
      return false;
    }
    const targetUiLocale = resolveTargetUiLocale(recipeLocale);
    if (targetUiLocale && targetUiLocale !== $getLocale()) {
      return applyRecipeUiLocale(targetUiLocale);
    }
    activeUiLocale.value = undefined;
    return false;
  }

  /**
   * Apply the language choice returned by the recipe-locale modal: either follow
   * the app locale, or translate recipe UI labels to the recipe's language,
   * warning when that language has no matching app translation.
   */
  async function applyPageLanguageChoice(
    recipeLocale: string | undefined,
    pageLanguageMode: "recipe" | "app",
  ) {
    if (pageLanguageMode === "app") {
      activeUiLocale.value = undefined;
      return;
    }
    const targetUiLocale = resolveTargetUiLocale(recipeLocale);
    const applied = await applyRecipeUiLocale(targetUiLocale);
    if (
      !applied &&
      targetUiLocale &&
      !availableLocales.value.includes(targetUiLocale)
    ) {
      toast.add({
        color: "warning",
        title: $ts("recipeLocale.fallbackTitle"),
        description: $ts("recipeLocale.fallbackDescription", {
          locale: getLocaleDisplayName(
            targetUiLocale,
            $getLocale(),
            $getLocales(),
          ),
          fallback: getLocaleDisplayName(
            $getLocale(),
            $getLocale(),
            $getLocales(),
          ),
        }),
        duration: 3000,
      });
    }
  }

  return {
    recipeT,
    activeUiLocale,
    availableLocales,
    pageLanguageModeCookie,
    applyRecipeUiLocale,
    syncPageUiLocale,
    applyPageLanguageChoice,
    clearUiLocale,
  };
}

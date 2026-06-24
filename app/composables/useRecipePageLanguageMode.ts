/** Cookie controlling whether the recipe page UI follows the recipe or the app locale. */
export function useRecipePageLanguageMode() {
  return useCookie<"recipe" | "app">("ui:recipe:page-language-mode", {
    default: () => "app",
    maxAge: 60 * 60 * 24 * 365,
  });
}

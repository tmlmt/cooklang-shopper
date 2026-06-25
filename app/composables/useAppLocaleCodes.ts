/** App locale codes configured in nuxt-i18n-micro. */
export function useAppLocaleCodes() {
  const { $getLocales } = useNuxtApp();
  return computed(() => $getLocales().map((l) => l.code));
}

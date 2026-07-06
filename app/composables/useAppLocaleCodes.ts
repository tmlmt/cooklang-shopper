/** App locale codes configured in nuxt-i18n-micro (excludes runtime-disabled locales). */
export function useAppLocaleCodes() {
  const { $getLocales } = useNuxtApp();
  return computed(() =>
    $getLocales()
      .filter((l: { disabled?: boolean }) => !l.disabled)
      .map((l) => l.code),
  );
}

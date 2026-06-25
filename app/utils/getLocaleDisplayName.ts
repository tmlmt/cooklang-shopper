import type { Locale } from "nuxt-i18n-micro";

export function getLocaleDisplayName(
  localeCode: string,
  currentAppLocale: string,
  locales: Locale[],
): string {
  const locale = locales.find((item) => item.code === localeCode);
  return (
    locale?.displayName ??
    capitalize(
      new Intl.DisplayNames([currentAppLocale], { type: "language" }).of(
        localeCode,
      ) ?? localeCode.toUpperCase(),
    )
  );
}

import type { DropdownMenuItem } from "@nuxt/ui";

type LocaleWithFlag = {
  code: string;
  flag?: string;
  displayName?: string;
};

export function useLanguageSwitcher() {
  const { $getLocale, $getLocales, $switchLocale } = useNuxtApp();

  const currentLocale = computed(() => {
    const locale = $getLocales().find(
      (item: LocaleWithFlag) => item.code === $getLocale(),
    );
    return locale ?? { code: $getLocale(), flag: undefined };
  });

  const otherLocales = computed<DropdownMenuItem[]>(() =>
    $getLocales()
      .filter((item: LocaleWithFlag) => item.code !== currentLocale.value.code)
      .map((locale: LocaleWithFlag) => ({
        label: `${locale.flag ?? ""} ${locale.displayName}`.trim(),
        onSelect: () => $switchLocale(locale.code),
      })),
  );

  const languageMenuItem = computed<DropdownMenuItem>(() => ({
    icon: "material-symbols:language-japanese-kana",
    label:
      `${currentLocale.value.flag as string} ${currentLocale.value.displayName ?? currentLocale.value.code}`.trim(),
    children: otherLocales.value,
  }));

  return {
    languageMenuItem,
  };
}

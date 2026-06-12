import type { DropdownMenuItem } from "@nuxt/ui";

type LocaleWithFlag = {
  code: string;
  flag?: string;
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
        label: `${locale.flag ?? ""} ${locale.code.toUpperCase()}`.trim(),
        onSelect: () => $switchLocale(locale.code),
      })),
  );

  const languageMenuItem = computed<DropdownMenuItem>(() => ({
    icon: "material-symbols:language-japanese-kana",
    label: (currentLocale.value.flag as string) ?? currentLocale.value.code,
    children: otherLocales.value,
  }));

  return {
    languageMenuItem,
  };
}

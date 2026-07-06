import type { DropdownMenuItem } from "@nuxt/ui";

type LocaleWithFlag = {
  code: string;
  flag?: string;
  displayName?: string;
};

export function useLanguageSwitcher() {
  const { $getLocale, $getLocales, $switchLocale } = useNuxtApp();

  // composer for preserving scroll on locale switch
  const { setPreserve } = useLocaleSwitchPreserve();

  const currentLocale = computed(() => {
    const locale = $getLocales().find(
      (item: LocaleWithFlag) => item.code === $getLocale(),
    );
    return locale ?? { code: $getLocale(), flag: undefined };
  });

  const otherLocales = computed<DropdownMenuItem[]>(() =>
    $getLocales()
      .filter(
        (item: LocaleWithFlag & { disabled?: boolean }) =>
          !item.disabled && item.code !== currentLocale.value.code,
      )
      .map((locale: LocaleWithFlag) => ({
        label: `${locale.flag ?? ""} ${locale.displayName}`.trim(),
        onSelect: async () => {
          setPreserve();
          await $switchLocale(locale.code);
        },
      })),
  );

  const languageMenuItem = computed<DropdownMenuItem>(() => ({
    icon: "material-symbols:language-japanese-kana",
    label:
      `${currentLocale.value.flag as string} ${currentLocale.value.displayName ?? currentLocale.value.code}`.trim(),
    children: otherLocales.value,
  }));

  const enabledLocales = computed(() =>
    $getLocales().filter(
      (item: LocaleWithFlag & { disabled?: boolean }) => !item.disabled,
    ),
  );

  const isMultilingual = computed(() => enabledLocales.value.length > 1);

  return {
    languageMenuItem,
    isMultilingual,
  };
}

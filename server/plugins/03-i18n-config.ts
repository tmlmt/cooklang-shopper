function assertLocalesExist(
  values: string[],
  allowed: string[],
  field: string,
) {
  const invalidValues = values.filter((value) => !allowed.includes(value));
  if (invalidValues.length > 0) {
    throw createError({
      status: 500,
      message: `config.i18n.${field} contains invalid locale codes: ${invalidValues.join(", ")}`,
    });
  }
}

/**
 * This server plugin reads the app's config.yaml at startup and applies any
 * i18n overrides into runtimeConfig.public.i18nRuntime, which read by nuxt-i18n-micro
 * to override its locale settings at runtime. This allows deployment specific locale settings
 */
export default defineNitroPlugin(async () => {
  const config = await getAppConfig();
  const runtimeConfig = useRuntimeConfig();
  const allowedLocales = runtimeConfig.public.i18nLocales as
    | string[]
    | undefined;

  if (!allowedLocales || allowedLocales.length === 0) {
    return;
  }

  if (config.i18n?.defaultLocale) {
    assertLocalesExist(
      [config.i18n.defaultLocale],
      allowedLocales,
      "defaultLocale",
    );
    runtimeConfig.public.i18nRuntime.defaultLocale = config.i18n.defaultLocale;
  }

  if (config.i18n?.fallbackLocale) {
    assertLocalesExist(
      [config.i18n.fallbackLocale],
      allowedLocales,
      "fallbackLocale",
    );
    runtimeConfig.public.i18nRuntime.fallbackLocale =
      config.i18n.fallbackLocale;
  }

  if (config.i18n?.disabledLocales && config.i18n.disabledLocales.length > 0) {
    assertLocalesExist(
      config.i18n.disabledLocales,
      allowedLocales,
      "disabledLocales",
    );
    runtimeConfig.public.i18nRuntime.disabledLocales =
      config.i18n.disabledLocales;
  }
});

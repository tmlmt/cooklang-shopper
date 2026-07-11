/**
 * Applies deployment-specific i18n overrides from config.yaml so that
 * nuxt-i18n-micro picks them up at runtime on both the server and the client.
 *
 * nuxt-i18n-micro reads its runtime overrides from the
 * `NUXT_PUBLIC_I18N_RUNTIME_*` environment variables (and mirrors them into
 * `runtimeConfig.public.i18nRuntime`). We set those env vars here — the public
 * runtime-config object itself is frozen and cannot be mutated directly. Nuxt
 * applies `NUXT_PUBLIC_*` overrides onto `runtimeConfig.public` and serialises
 * the result into the client payload, so the same overrides reach the browser.
 *
 * The library only exposes a `disabledLocales` deny-list. We accept the more
 * intuitive `enabledLocales` allow-list in config.yaml and translate it into the
 * `disabledLocales` deny-list. `i18nLocales` (declared in nuxt.config.ts) is the
 * single source of truth for the full set of locales baked into the build.
 *
 * Runs before 03-recipe-index so the recipe index picks up the overridden
 * default locale.
 */

function assertLocalesExist(
  values: string[],
  allowed: string[],
  field: string,
) {
  const invalid = values.filter((value) => !allowed.includes(value));
  if (invalid.length > 0) {
    throw createError({
      status: 500,
      message: `config.i18n.${field} contains invalid locale codes: ${invalid.join(
        ", ",
      )}. Valid codes are: ${allowed.join(", ")}`,
    });
  }
}

export default defineNitroPlugin(async () => {
  const config = await getAppConfig();
  const i18n = config.i18n;
  if (!i18n) return;

  const buildLocales = useRuntimeConfig().public.i18nLocales as
    string[] | undefined;

  if (!buildLocales || buildLocales.length === 0) {
    return;
  }

  // Validate + resolve the enabled allow-list. An omitted list means "all
  // locales enabled"; an explicit empty list is a misconfiguration.
  let enabledLocales: string[] = buildLocales;
  if (i18n.enabledLocales !== undefined) {
    if (
      !Array.isArray(i18n.enabledLocales) ||
      i18n.enabledLocales.some((locale) => typeof locale !== "string")
    ) {
      throw createError({
        status: 500,
        message:
          "config.i18n.enabledLocales must be an array of locale code strings",
      });
    }
    if (i18n.enabledLocales.length === 0) {
      throw createError({
        status: 500,
        message:
          "config.i18n.enabledLocales cannot be empty. Omit it to enable all locales.",
      });
    }
    assertLocalesExist(i18n.enabledLocales, buildLocales, "enabledLocales");
    enabledLocales = [...new Set(i18n.enabledLocales)];
  }

  // defaultLocale must be a build locale and must be enabled.
  if (i18n.defaultLocale) {
    assertLocalesExist([i18n.defaultLocale], buildLocales, "defaultLocale");
    if (!enabledLocales.includes(i18n.defaultLocale)) {
      throw createError({
        status: 500,
        message: `config.i18n.defaultLocale "${i18n.defaultLocale}" is not part of enabledLocales`,
      });
    }
    process.env.NUXT_PUBLIC_I18N_RUNTIME_DEFAULT_LOCALE = i18n.defaultLocale;
  }

  // fallbackLocale must be a build locale and must be enabled.
  if (i18n.fallbackLocale) {
    assertLocalesExist([i18n.fallbackLocale], buildLocales, "fallbackLocale");
    if (!enabledLocales.includes(i18n.fallbackLocale)) {
      throw createError({
        status: 500,
        message: `config.i18n.fallbackLocale "${i18n.fallbackLocale}" is not part of enabledLocales`,
      });
    }
    process.env.NUXT_PUBLIC_I18N_RUNTIME_FALLBACK_LOCALE = i18n.fallbackLocale;
  }

  // Translate the enabled allow-list into the deny-list nuxt-i18n-micro expects.
  const disabledLocales = buildLocales.filter(
    (locale) => !enabledLocales.includes(locale),
  );
  if (disabledLocales.length > 0) {
    process.env.NUXT_PUBLIC_I18N_RUNTIME_DISABLED_LOCALES =
      disabledLocales.join(",");
  }
});

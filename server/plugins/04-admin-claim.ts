/**
 * When Google/Microsoft account providers are configured but no user has
 * claimed their invite yet, surface a one-time claim code so the first admin
 * can bootstrap themselves.
 */
export default defineNitroPlugin(async () => {
  const config = await getAppConfig();
  if (!hasAccountProviders(config)) return;

  if (await hasAnyActiveUser()) {
    clearClaimCode();
    return;
  }

  const code = ensureClaimCode();
  printClaimBanner(code);
});

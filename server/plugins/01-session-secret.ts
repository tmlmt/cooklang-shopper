export default defineNitroPlugin(async () => {
  const config = await getAppConfig();
  process.env.NUXT_SESSION_PASSWORD = config.sessionSecret;
  process.env.NUXT_PUBLIC_TITLE = config.title || "Cooklang Shopper";
});

export default defineNitroPlugin(async () => {
  const config = await getAppConfig();
  process.env.NUXT_SESSION_PASSWORD = config.sessionSecret;
});

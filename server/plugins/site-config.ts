export default defineNitroPlugin(async (nitroApp) => {
  const config = await getAppConfig();
  nitroApp.hooks.hook("site-config:init", ({ siteConfig }) => {
    siteConfig.push({
      name: config.title,
      url: config.baseUrl,
      description: config.description,
    });
  });
});

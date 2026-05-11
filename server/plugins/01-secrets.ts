function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

export default defineNitroPlugin(async () => {
  const config = await getAppConfig();
  process.env.NUXT_SESSION_PASSWORD = config.sessionSecret;
  process.env.NUXT_OG_IMAGE_SECRET = config.ogImageSecret ?? generateSecret();
});

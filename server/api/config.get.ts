import { getAppConfig } from "#server/utils/appConfig";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const config = await getAppConfig();

  return {
    experimental: config.experimental ?? false,
  };
});

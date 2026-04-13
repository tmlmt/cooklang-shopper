import { getAppConfig } from "#server/utils/appConfig";
import type { PublicSharingConfig } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  await requireUserSession(event).catch(() => null);

  const config = await getAppConfig();

  const sharing: PublicSharingConfig = {
    defaultVisibility: config.sharing?.defaultVisibility ?? "private",
    allowPublicBrowsing: config.sharing?.allowPublicBrowsing ?? false,
    federationEnabled: config.sharing?.federation?.enabled ?? false,
    about: config.sharing?.about,
  };

  return {
    experimental: config.experimental ?? false,
    sharing,
  };
});

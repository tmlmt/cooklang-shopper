import { getAppConfig } from "#server/utils/appConfig";
import type {
  PublicAuthProvider,
  PublicSharingConfig,
  ShoppingEnabled,
} from "~~/shared/types";

export default defineEventHandler(async (event) => {
  await requireUserSession(event).catch(() => null);

  const config = await getAppConfig();

  const sharing: PublicSharingConfig = {
    defaultVisibility: config.sharing?.defaultVisibility ?? "private",
    allowPublicBrowsing: config.sharing?.allowPublicBrowsing ?? false,
    viewerCanShare: config.sharing?.viewerCanShare ?? false,
    federationEnabled: config.sharing?.federation?.enabled ?? false,
    about: config.sharing?.about,
  };

  const authProviders: PublicAuthProvider[] = config.auth.providers.map(
    (p) => ({
      type: p.type,
      name: p.name,
    }),
  );

  const shopping: ShoppingEnabled = config.shopping?.enabled ?? false;

  return {
    title: config.title || "Cooklang Shopper",
    shopping,
    experimental: config.experimental ?? false,
    authProviders,
    sharing,
    baseUrl: config.baseUrl,
    aiEnabled: !!config.ai,
  };
});

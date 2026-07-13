import { getAppConfig } from "#server/utils/appConfig";
import { getAdapter } from "#server/utils/onlineStore/adapters";
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
  const cart: ShoppingEnabled = config.cart?.enabled ?? false;

  const provider = config.cart?.store?.provider;
  const storeAdapter = provider ? getAdapter(provider) : undefined;

  return {
    title: config.title || "Cooklang Shopper",
    description: config.description,
    shopping,
    cart,
    onlineStoreProvider: provider,
    onlineStoreCartUrl: storeAdapter?.cartUrl,
    authProviders,
    sharing,
    baseUrl: config.baseUrl,
    aiEnabled: !!config.ai,
  };
});

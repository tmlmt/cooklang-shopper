import type {
  AuthProviderType,
  PublicAuthProvider,
  PublicSharingConfig,
  ShoppingEnabled,
} from "~~/shared/types";

const defaultSharing: PublicSharingConfig = {
  defaultVisibility: "private",
  allowPublicBrowsing: false,
  viewerCanShare: false,
  federationEnabled: false,
};

export async function usePublicConfig() {
  const { data } = await useFetch("/api/config", {
    key: "public-config",
    default: () => ({
      title: "",
      description: undefined as string | undefined,
      shopping: false as ShoppingEnabled,
      cart: false as ShoppingEnabled,
      onlineStoreProvider: undefined as string | undefined,
      onlineStoreCartUrl: undefined as string | undefined,
      authProviders: [
        { type: "password", name: "local" },
      ] as PublicAuthProvider[],
      sharing: defaultSharing,
      baseUrl: "",
      aiEnabled: false,
    }),
  });

  const title = computed(() => data.value?.title || "");
  const shopping = computed(() => data.value?.shopping ?? false);
  const cart = computed(() => data.value?.cart ?? false);
  const onlineStoreProvider = computed(() => data.value?.onlineStoreProvider);
  const onlineStoreCartUrl = computed(() => data.value?.onlineStoreCartUrl);
  const sharing = computed(() => data.value?.sharing ?? defaultSharing);
  const baseUrl = computed(() => data.value?.baseUrl ?? "");
  const viewerCanShare = computed(
    () => data.value?.sharing?.viewerCanShare ?? false,
  );
  const authProviders = computed(
    () => data.value?.authProviders ?? ([] as PublicAuthProvider[]),
  );

  function hasAuth(type: AuthProviderType): boolean {
    return authProviders.value.some((p) => p.type === type);
  }

  function getAuthProviders(type: AuthProviderType): PublicAuthProvider[] {
    return authProviders.value.filter((p) => p.type === type);
  }

  const aiEnabled = computed(() => data.value?.aiEnabled ?? false);
  const description = computed(() => data.value?.description);

  return {
    title,
    description,
    shopping,
    cart,
    onlineStoreProvider,
    onlineStoreCartUrl,
    sharing,
    baseUrl,
    viewerCanShare,
    authProviders,
    aiEnabled,
    hasAuth,
    getAuthProviders,
  };
}

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
      shopping: false as ShoppingEnabled,
      experimental: false,
      authProviders: [
        { type: "password", name: "local" },
      ] as PublicAuthProvider[],
      sharing: defaultSharing,
      baseUrl: "",
    }),
  });

  const title = computed(() => data.value?.title || "");
  const shopping = computed(() => data.value?.shopping ?? false);
  const experimental = computed(() => data.value?.experimental ?? false);
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

  return {
    title,
    shopping,
    experimental,
    sharing,
    baseUrl,
    viewerCanShare,
    authProviders,
    hasAuth,
    getAuthProviders,
  };
}

import type {
  AuthProviderType,
  PublicAuthProvider,
  PublicSharingConfig,
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
      experimental: false,
      authProviders: [
        { type: "password", name: "local" },
      ] as PublicAuthProvider[],
      sharing: defaultSharing,
    }),
  });

  const experimental = computed(() => data.value?.experimental ?? false);
  const title = computed(() => useRuntimeConfig().public.title as string);
  const sharing = computed(() => data.value?.sharing ?? defaultSharing);
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
    experimental,
    title,
    sharing,
    viewerCanShare,
    authProviders,
    hasAuth,
    getAuthProviders,
  };
}

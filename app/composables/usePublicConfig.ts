import type { PublicSharingConfig } from "~~/shared/types";

const defaultSharing: PublicSharingConfig = {
  defaultVisibility: "private",
  allowPublicBrowsing: false,
  viewerCanShare: false,
  federationEnabled: false,
};

export async function usePublicConfig() {
  const { data } = await useFetch("/api/config", {
    key: "public-config",
    default: () => ({ experimental: false, sharing: defaultSharing }),
  });

  const experimental = computed(() => data.value?.experimental ?? false);
  const title = computed(() => useRuntimeConfig().public.title as string);
  const sharing = computed(() => data.value?.sharing ?? defaultSharing);
  const viewerCanShare = computed(
    () => data.value?.sharing?.viewerCanShare ?? false,
  );

  return { experimental, title, sharing, viewerCanShare };
}

export function usePublicConfig() {
  const { data } = useFetch("/api/config", {
    default: () => ({ experimental: false }),
  });

  const experimental = computed(() => data.value?.experimental ?? false);

  return { experimental };
}

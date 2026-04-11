export function usePublicConfig() {
  const { data } = useFetch("/api/config", {
    default: () => ({ experimental: false }),
  });

  const experimental = computed(() => data.value?.experimental ?? false);
  const title = computed(() => useRuntimeConfig().public.title as string);

  return { experimental, title };
}

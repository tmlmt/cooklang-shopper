export function usePreviousRoute() {
  const previousRoute = useState<string | null>("previous-route", () => null);

  const hasInAppHistory = computed(() => previousRoute.value !== null);

  return { previousRoute, hasInAppHistory };
}

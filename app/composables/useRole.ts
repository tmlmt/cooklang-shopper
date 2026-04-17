export function useRole() {
  const { user } = useUserSession();
  const isEditor = computed(() => user.value?.role === "editor");
  return { isEditor };
}

export function useRole() {
  const { user } = useUserSession();
  const isAdmin = computed(() => user.value?.role === "admin");
  const isEditor = computed(
    () => user.value?.role === "editor" || user.value?.role === "admin",
  );
  return { isEditor, isAdmin };
}

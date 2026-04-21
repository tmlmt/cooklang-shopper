export async function useShoppingEnabled() {
  const { user } = useUserSession();
  const { isEditor } = useRole();
  const { shopping } = await usePublicConfig();

  const shoppingEnabled = computed(() => {
    if (!user.value) return false;
    if (shopping.value === true) return true;
    if (shopping.value === "editor-only") return isEditor.value;
    return false;
  });

  return { shoppingEnabled };
}

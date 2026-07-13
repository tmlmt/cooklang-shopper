export async function useCartEnabled() {
  const { user } = useUserSession();
  const { isEditor } = useRole();
  const { cart } = await usePublicConfig();

  const cartEnabled = computed(() => {
    if (!user.value) return false;
    if (cart.value === true) return true;
    if (cart.value === "editor-only") return isEditor.value;
    return false;
  });

  return { cartEnabled };
}

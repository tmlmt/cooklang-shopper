export default defineNuxtRouteMiddleware((to, from) => {
  const { clearHeaderMenuItems, clearHeaderActions } = useHeaderMenu();
  clearHeaderMenuItems();
  clearHeaderActions();

  if (from.name) {
    const { previousRoute } = usePreviousRoute();
    previousRoute.value = from.path;
  }
});

export default defineNuxtRouteMiddleware(() => {
  const { clearHeaderMenuItems, clearHeaderActions } = useHeaderMenu();
  clearHeaderMenuItems();
  clearHeaderActions();
});

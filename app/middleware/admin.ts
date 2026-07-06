export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession();
  const { $localeRoute } = useI18n();
  if (!hasAdminAccess(user.value?.role)) {
    return navigateTo($localeRoute("/"));
  }
});

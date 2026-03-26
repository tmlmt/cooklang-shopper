export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession();

  if (!loggedIn.value && to.path !== "/auth") {
    return navigateTo("/auth");
  }

  const { experimental } = usePublicConfig();
  if (!experimental.value && (to.path === "/list" || to.path === "/cart")) {
    return navigateTo("/");
  }
});

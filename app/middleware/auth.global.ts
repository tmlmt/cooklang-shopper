export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession();

  if (!loggedIn.value && to.path !== "/auth") {
    return navigateTo("/auth");
  }
});

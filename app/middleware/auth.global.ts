export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn } = useUserSession();
  const { experimental, sharing } = await usePublicConfig();

  if (!loggedIn.value) {
    // Always allow auth page, share links, and direct recipe pages
    // (recipe API handles per-recipe visibility and returns 401 for private ones)
    if (
      to.path === "/auth" ||
      to.path.startsWith("/s/") ||
      to.path.startsWith("/recipe/")
    ) {
      return;
    }

    // Allow public browsing pages if enabled
    if (sharing.value.allowPublicBrowsing) {
      const isPublicRoute = to.path === "/" || to.path.startsWith("/browse/");
      if (isPublicRoute) return;
    }

    return navigateTo("/auth");
  }

  if (!experimental.value && (to.path === "/list" || to.path === "/cart")) {
    return navigateTo("/");
  }
});

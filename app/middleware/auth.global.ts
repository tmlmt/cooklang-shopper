export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn } = useUserSession();
  const { shopping, sharing, experimental } = await usePublicConfig();

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

  if ((to.path === "/list" || to.path === "/pantry") && !shopping.value) {
    return navigateTo("/");
  }

  if (
    (to.path === "/list" || to.path === "/pantry") &&
    shopping.value === "editor-only"
  ) {
    const { user } = useUserSession();
    if (user.value?.role !== "editor") {
      return navigateTo("/");
    }
  }

  if (to.path === "/cart" && !experimental.value) {
    return navigateTo("/");
  }
});

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn } = useUserSession();
  const { shopping, sharing, experimental } = await usePublicConfig();

  // Strip any locale prefix (e.g. /fr/s/r/token → /s/r/token) so all path
  // checks below work regardless of the active UI language.
  const { $getLocales } = useNuxtApp();
  const localeCodes = ($getLocales() as { code: string }[])
    .map((l) => l.code)
    .join("|");
  const localePrefixRe = new RegExp(`^/(${localeCodes})(/.*)?$`);
  const localeMatch = to.path.match(localePrefixRe);
  const canonicalPath = localeMatch ? (localeMatch[2] ?? "/") : to.path;

  if (!loggedIn.value) {
    // Always allow auth page, share links, and direct recipe pages
    // (recipe API handles per-recipe visibility and returns 401 for private ones)
    if (
      canonicalPath === "/auth" ||
      canonicalPath.startsWith("/s/") ||
      canonicalPath.startsWith("/recipe/")
    ) {
      return;
    }

    // Allow public browsing pages if enabled
    if (sharing.value.allowPublicBrowsing) {
      const isPublicRoute =
        canonicalPath === "/" || canonicalPath.startsWith("/browse/");
      if (isPublicRoute) return;
    }

    return navigateTo("/auth");
  }

  if ((canonicalPath === "/list" || canonicalPath === "/pantry") && !shopping.value) {
    return navigateTo("/");
  }

  if (
    (canonicalPath === "/list" || canonicalPath === "/pantry") &&
    shopping.value === "editor-only"
  ) {
    const { user } = useUserSession();
    if (user.value?.role !== "editor") {
      return navigateTo("/");
    }
  }

  if (canonicalPath === "/cart" && !experimental.value) {
    return navigateTo("/");
  }
});

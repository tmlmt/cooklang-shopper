import type { RouterConfig } from "@nuxt/schema";

export default {
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    try {
      const { preserve, scrollY, clearPreserve } = useLocaleSwitchPreserve();
      if (preserve?.value) {
        clearPreserve();
          return { top: scrollY.value || 0, left: 0 };
      }
} catch {
      // composable not available or called too early — fall through to defaults
    }

    if (to.hash) return { el: to.hash, behavior: "instant" };
    // Return undefined for normal navigation to use Nuxt's default smooth scroll-to-top
    return undefined;
  },
} satisfies RouterConfig;

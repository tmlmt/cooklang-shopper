// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-10-31",
  devtools: { enabled: true },

  modules: [
    "nuxt-security",
    "@nuxt/hints",
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/test-utils/module",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/ui",
    "nuxt-auth-utils",
    "nuxt-seo-utils",
  ],

  css: ["~/assets/css/main.css"],

  icon: {
    serverBundle: "remote",
  },

  image: {
    ipx: {
      sharpOptions: {
        autoOrient: true,
      },
    },
  },

  nitro: {
    storage: {
      recipes: {
        driver: "fs",
        base: "./public/recipes",
      },
      config: {
        driver: "fs",
        base: "./public/config",
      },
    },
  },

  runtimeConfig: {
    session: {
      name: "nuxt-session",
      password: process.env.NUXT_SESSION_PASSWORD || "",
      cookie: {
        sameSite: "lax",
      },
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  },

  security: {
    headers: {
      contentSecurityPolicy: {
        "img-src": ["'self'", "data:", "blob:", "https:"],
      },
    },
    requestSizeLimiter: {
      maxUploadFileRequestInBytes: 11000000,
    },
  },

  routeRules: {
    // Public API routes can be accessed from any origin, but only allow GET and HEAD requests.
    "/api/public/**": {
      security: {
        corsHandler: {
          origin: "*",
          methods: ["GET", "HEAD"],
        },
      },
    },
    // Cooklang content uses > for notes and & for references, which the XSS filter escapes to &gt; and &amp;.
    // These routes require editor auth; content is stored as raw text, never rendered as HTML.
    "/api/recipes": {
      security: { xssValidator: false },
    },
    "/api/recipe/**": {
      security: { xssValidator: false },
    },
    "/api/recipe/convert": {
      headers: {
        "X-Accel-Buffering": "no",
      },
    },
  },

  vite: {
    optimizeDeps: {
      include: ["@tmlmt/cooklang-parser", "valibot", "human-regex"],
    },
  },
});
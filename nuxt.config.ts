// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-10-31",
  devtools: { enabled: true },

  modules: [
    "@nuxt/hints",
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/test-utils/module",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/ui",
    "nuxt-auth-utils",
  ],

  css: ["~/assets/css/main.css"],

  icon: {
    serverBundle: "remote",
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

  vite: {
    optimizeDeps: {
      include: ["@tmlmt/cooklang-parser", "valibot"],
    },
  },
});

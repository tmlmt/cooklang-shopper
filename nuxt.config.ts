import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-10-31",
  devtools: { enabled: true },

  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/ui",
  ],

  css: ["~/assets/css/main.css"],

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
    plugins: [tailwindcss()],
  },
});

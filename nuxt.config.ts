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
    // Inline packages with CJS/ESM mismatches or missing transitive deps
    externals: {
      inline: [
        "@adonisjs/hash",
        "@iconify/utils",
        "@poppinss/string",
        "@poppinss/utils",
        "@vue/devtools-kit",
        "@vue/devtools-shared",
        "big.js",
        "c12",
        "chokidar",
        "css-select",
        "css-tree",
        "css-what",
        "defu",
        "flattie",
        "glob",
        "h3",
        "heap",
        "hookable",
        "ipx",
        "mdn-data",
        "ofetch",
        "pinia",
        "pkg-types",
        "pluralize",
        "rc9",
        "readdirp",
        "safe-stable-stringify",
        "sax",
        "secure-json-parse",
        "slugify",
        "source-map-js",
        "svgo",
        "ufo",
        "unhead",
        "yalps",
      ],
    },
  },

  vite: {
    optimizeDeps: {
      include: ["@tmlmt/cooklang-parser", "valibot"],
    },
  },
});

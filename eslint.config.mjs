// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginTailwindcss from "eslint-plugin-tailwindcss";

export default withNuxt(
  eslintConfigPrettier,
  {
    ignores: ["eslint.config.mjs", "prisma.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["scripts/*"],
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  {
    ...eslintPluginTailwindcss.configs.recommended,
    files: ["**/*.vue", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    settings: {
      tailwindcss: {
        cssConfigPath: "./app/assets/css/main.css",
      },
    },
  },
);

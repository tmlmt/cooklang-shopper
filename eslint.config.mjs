// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default withNuxt(
  eslintConfigPrettier,
  {
    ignores: ["eslint.config.mjs"],
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
);

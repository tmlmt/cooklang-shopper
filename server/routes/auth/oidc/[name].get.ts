import { defineEventHandler } from "nuxt/server";

export default defineEventHandler((event) =>
  handleOidcCallback(event, "/auth/oidc"),
);

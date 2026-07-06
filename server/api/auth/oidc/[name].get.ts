export default defineEventHandler((event) =>
  handleOidcCallback(event, "/api/auth/oidc"),
);

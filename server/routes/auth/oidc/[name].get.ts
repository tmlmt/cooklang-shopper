export default defineEventHandler((event) =>
  handleOidcCallback(event, "/auth/oidc"),
);

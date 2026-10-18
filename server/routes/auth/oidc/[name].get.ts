// h3 dependance
// handleOidcCallback() depends on nuxt-auth-utils methods that in turn rely on H3.

export default defineEventHandler((event) =>
  handleOidcCallback(event, "/auth/oidc"),
);

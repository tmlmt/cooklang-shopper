// h3 dependance:
// handleOidcCallback() depends on H3 events

export default defineEventHandler((event) =>
  handleOidcCallback(event, "/api/auth/oidc"),
);

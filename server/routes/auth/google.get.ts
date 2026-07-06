export default defineEventHandler(async (event) => {
  const config = await getAppConfig();
  const provider = getGoogleProvider(config);
  if (!provider) {
    throw createError({ status: 404, message: "Google login is not enabled" });
  }

  // Invitation token is carried through the OAuth round-trip via the `state`
  // parameter (Google echoes it back on the callback).
  const inviteToken =
    (getQuery(event).state as string | undefined) || undefined;

  const handler = defineOAuthGoogleEventHandler({
    config: {
      clientId: provider.config.clientId,
      clientSecret: provider.config.clientSecret,
      scope: ["openid", "email", "profile"],
      redirectURL: `${config.baseUrl!.replace(/\/$/, "")}/auth/google`,
    },
    async onSuccess(event, { user }) {
      const result = await resolveAccountLogin(
        "google",
        user as unknown as Record<string, unknown>,
        inviteToken,
      );
      return applyAccountLoginResult(event, result);
    },
    async onError(event) {
      return sendRedirect(event, "/auth?error=account");
    },
  });

  try {
    return await handler(event);
  } catch {
    return sendRedirect(event, "/auth?error=account-unreachable");
  }
});

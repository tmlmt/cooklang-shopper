export default defineEventHandler(async (event) => {
  const config = await getAppConfig();
  const provider = getMicrosoftProvider(config);
  if (!provider) {
    throw createError({
      status: 404,
      message: "Microsoft login is not enabled",
    });
  }

  // Invitation token is carried through the OAuth round-trip via the `state`
  // parameter (Microsoft echoes it back on the callback).
  const inviteToken =
    (getQuery(event).state as string | undefined) || undefined;

  const handler = defineOAuthMicrosoftEventHandler({
    config: {
      clientId: provider.config.clientId,
      clientSecret: provider.config.clientSecret,
      tenant: provider.config.tenant || "common",
      scope: ["openid", "email", "profile", "User.Read"],
      redirectURL: `${config.baseUrl!.replace(/\/$/, "")}/auth/microsoft`,
    },
    async onSuccess(event, { user }) {
      const result = await resolveAccountLogin(
        "microsoft",
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

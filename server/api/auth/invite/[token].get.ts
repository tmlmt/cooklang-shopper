/**
 * Public endpoint used by the claim page to check whether an invitation token
 * is still valid and which account providers are available.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({ status: 400, message: "Missing invitation token" });
  }

  const invitation = await findValidInvitation(token);
  const config = await getAppConfig();

  return {
    valid: !!invitation,
    providers: {
      google: !!getGoogleProvider(config),
      microsoft: !!getMicrosoftProvider(config),
    },
  };
});

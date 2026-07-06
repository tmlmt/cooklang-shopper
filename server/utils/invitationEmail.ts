import type { H3Event } from "h3";

/**
 * Send an invitation email. Returns true if sent, false if SMTP is not
 * configured (the caller should surface the invite link instead).
 */
export async function sendInvitationEmail(
  event: H3Event,
  email: string,
  inviteUrl: string,
): Promise<boolean> {
  const config = await getAppConfig();
  const appTitle = config.title || "Cooklang Shopper";
  const defaultLocale = config.i18n?.defaultLocale ?? "en";

  // Always use the instance default locale — the invitee's preferred language
  // is unknown at invite time.
  const t = await useTranslationServerMiddleware(
    event,
    defaultLocale,
    defaultLocale,
  );

  return sendMail({
    to: email,
    subject: t("email.invitation.subject", { app: appTitle }),
    text: t("email.invitation.body", { app: appTitle, url: inviteUrl }),
  });
}

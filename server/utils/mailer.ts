import { createTransport, type Transporter } from "nodemailer";
import type { AppConfig } from "~~/shared/types";

let transporter: Transporter | null = null;

/**
 * Lazily create the shared SMTP transporter from config.smtp.
 * Returns null when SMTP is not configured (callers should fall back to
 * surfacing a copyable link instead).
 */
function getTransporter(config: AppConfig): Transporter | null {
  if (!config.smtp) return null;
  if (transporter) return transporter;

  const { host, port, secure, auth } = config.smtp;
  transporter = createTransport({
    host,
    port,
    secure: secure ?? port === 465,
    auth: auth ? { user: auth.user, pass: auth.pass } : undefined,
  });
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Whether email sending is available (SMTP configured). */
export async function isMailEnabled(): Promise<boolean> {
  const config = await getAppConfig();
  return !!config.smtp;
}

/**
 * Send an email via the configured SMTP transport.
 * Returns true if sent, false if SMTP is not configured.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const config = await getAppConfig();
  const tx = getTransporter(config);
  if (!tx || !config.smtp) return false;

  await tx.sendMail({
    from: config.smtp.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  return true;
}

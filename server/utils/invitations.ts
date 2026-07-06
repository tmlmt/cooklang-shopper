import { createHash, randomBytes } from "node:crypto";

/** Default lifetime of an invitation, in days. */
export const INVITATION_TTL_DAYS = 7;

/** Generate a random invitation token and its storage hash. */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

/** Hash an invitation token for storage/lookup (tokens are never stored raw). */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Build the public claim URL for a raw invitation token. */
export async function buildInviteUrl(token: string): Promise<string> {
  const config = await getAppConfig();
  const base = (config.baseUrl ?? "").replace(/\/$/, "");
  return `${base}/claim/${token}`;
}

/**
 * Create (or replace) the pending invitation for a user and return the raw
 * token. Any previous unconsumed invitations for the user are removed so only
 * the latest link is valid.
 */
export async function createInvitation(
  userId: number,
  ttlDays: number = INVITATION_TTL_DAYS,
): Promise<string> {
  const db = getDb();
  const { token, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.invitation.deleteMany({
      where: { userId, consumedAt: null },
    });
    await tx.invitation.create({
      data: { userId, tokenHash, expiresAt },
    });
  });

  return token;
}

/**
 * Look up a pending invitation by its raw token.
 * Returns the invitation only if it exists, is unconsumed and unexpired.
 */
export async function findValidInvitation(token: string) {
  const db = getDb();
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashInviteToken(token) },
  });
  if (!invitation) return null;
  if (invitation.consumedAt) return null;
  if (invitation.expiresAt.getTime() < Date.now()) return null;
  return invitation;
}

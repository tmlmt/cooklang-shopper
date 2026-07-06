import type { User } from "~~/generated/prisma/client";
import type { Role } from "~~/shared/types";
import { ACCOUNT_PROVIDER } from "#server/utils/appConfig";

/** The provider types backed by the DB user directory. */
export type AccountProviderType = "google" | "microsoft";

export interface AccountIdentity {
  subject: string;
  email?: string;
  displayName?: string;
}

/** The user object stored in the session for DB-backed accounts. */
export interface AccountSessionUser {
  profile: string;
  role: Role;
  provider: typeof ACCOUNT_PROVIDER;
  userId: string;
}

/**
 * Extract the stable identity from raw OAuth claims.
 * Google userinfo exposes `sub`; Microsoft Graph /me exposes `id` (the id_token
 * uses `sub`), so we read both defensively.
 */
export function extractAccountIdentity(
  provider: AccountProviderType,
  claims: Record<string, unknown>,
): AccountIdentity | null {
  const subject = String(claims.sub ?? claims.id ?? "").trim();
  if (!subject) return null;

  const email =
    (claims.email as string) ??
    (claims.mail as string) ??
    (claims.userPrincipalName as string) ??
    undefined;

  const displayName =
    (claims.name as string) ??
    (claims.displayName as string) ??
    (claims.given_name as string) ??
    undefined;

  return { subject, email, displayName };
}

/** Build the session user payload for a DB-backed account. */
export function buildAccountSessionUser(user: User): AccountSessionUser {
  return {
    profile: user.displayName || user.email,
    role: user.role as Role,
    provider: ACCOUNT_PROVIDER,
    userId: String(user.id),
  };
}

/** Whether an active admin account already exists. */
export async function hasActiveAdmin(): Promise<boolean> {
  const db = getDb();
  const count = await db.user.count({
    where: { role: "admin", status: "active" },
  });
  return count > 0;
}

/** Whether any user has claimed their invite (status active). */
export async function hasAnyActiveUser(): Promise<boolean> {
  const db = getDb();
  const count = await db.user.count({ where: { status: "active" } });
  return count > 0;
}

export type AccountLoginResult =
  | { type: "session"; user: AccountSessionUser }
  | {
      type: "admin-claim";
      identity: AccountIdentity;
      provider: AccountProviderType;
    }
  | { type: "deny"; reason: string };

/**
 * Resolve a login attempt from a Google/Microsoft OAuth callback.
 *
 * Resolution order:
 *   1. Known identity (provider + subject) → sign in with that user's role.
 *   2. Pending invitation token → bind identity, activate user, consume invite.
 *   3. No admin exists yet → offer admin bootstrap claim.
 *   4. Otherwise deny.
 */
export async function resolveAccountLogin(
  provider: AccountProviderType,
  claims: Record<string, unknown>,
  inviteToken?: string,
): Promise<AccountLoginResult> {
  const identity = extractAccountIdentity(provider, claims);
  if (!identity) {
    return { type: "deny", reason: "no-subject" };
  }

  const db = getDb();

  // 1. Known identity
  const existing = await db.userIdentity.findUnique({
    where: { provider_subject: { provider, subject: identity.subject } },
    include: { user: true },
  });
  if (existing) {
    return { type: "session", user: buildAccountSessionUser(existing.user) };
  }

  // 2. Pending invitation
  if (inviteToken) {
    const invitation = await findValidInvitation(inviteToken);
    if (!invitation) {
      return { type: "deny", reason: "invalid-invite" };
    }
    const user = await db.$transaction(async (tx) => {
      await tx.userIdentity.create({
        data: {
          userId: invitation.userId,
          provider,
          subject: identity.subject,
        },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { consumedAt: new Date() },
      });
      return tx.user.update({
        where: { id: invitation.userId },
        data: {
          status: "active",
          displayName: identity.displayName ?? undefined,
        },
      });
    });
    return { type: "session", user: buildAccountSessionUser(user) };
  }

  // 3. Admin bootstrap — only when no user has claimed their invite yet
  if (!(await hasAnyActiveUser())) {
    return { type: "admin-claim", identity, provider };
  }

  // 4. Deny
  return { type: "deny", reason: "unknown-identity" };
}

/**
 * Apply the result of {@link resolveAccountLogin}: establish the session,
 * stash a pending admin claim, or redirect back with an error.
 */
export async function applyAccountLoginResult(
  event: import("h3").H3Event,
  result: AccountLoginResult,
) {
  if (result.type === "session") {
    await setUserSession(event, { user: result.user });
    return sendRedirect(event, "/auth");
  }

  if (result.type === "admin-claim") {
    await replaceUserSession(event, {
      pendingClaim: {
        provider: result.provider,
        subject: result.identity.subject,
        email: result.identity.email,
        displayName: result.identity.displayName,
      },
    });
    return sendRedirect(event, "/claim-admin");
  }

  return sendRedirect(event, `/auth?error=account&reason=${result.reason}`);
}

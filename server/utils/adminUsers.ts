import type { Prisma } from "~~/generated/prisma/client";
import type { AdminUser, Role, UserStatus } from "~~/shared/types";

export const userWithRelations = {
  include: {
    identities: { select: { provider: true } },
    invitations: {
      where: { consumedAt: null },
      orderBy: { createdAt: "desc" as const },
      take: 1,
    },
  },
} satisfies Prisma.UserDefaultArgs;

type UserWithRelations = Prisma.UserGetPayload<typeof userWithRelations>;

/** Serialize a DB user (with relations) into the admin wire shape. */
export function serializeAdminUser(user: UserWithRelations): AdminUser {
  const pendingInvite = user.invitations[0];
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as Role,
    status: user.status as UserStatus,
    providers: user.identities.map((i) => i.provider),
    createdAt: user.createdAt.toISOString(),
    inviteExpiresAt:
      user.status === "invited" && pendingInvite
        ? pendingInvite.expiresAt.toISOString()
        : null,
  };
}

/** Number of active admins currently in the directory. */
export async function countActiveAdmins(): Promise<number> {
  const db = getDb();
  return db.user.count({ where: { role: "admin", status: "active" } });
}

/**
 * Throw if the given change would remove the last remaining active admin.
 * `nextRole` is the role the user would have after the change (undefined = the
 * user is being deleted).
 */
export async function assertNotLastAdmin(
  userId: number,
  nextRole?: Role,
): Promise<void> {
  const db = getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const wasActiveAdmin = user.role === "admin" && user.status === "active";
  if (!wasActiveAdmin) return;

  const staysAdmin = nextRole === "admin";
  if (staysAdmin) return;

  const admins = await countActiveAdmins();
  if (admins <= 1) {
    throw createError({
      status: 409,
      message: "Cannot remove the last administrator",
    });
  }
}

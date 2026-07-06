import * as v from "valibot";

const ClaimSchema = v.object({
  code: v.pipe(v.string(), v.nonEmpty(), v.maxLength(256)),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const pending = session.pendingClaim;
  if (!pending) {
    throw createError({ status: 400, message: "No pending admin claim" });
  }

  const { code } = await readValidatedBody(event, (body) =>
    v.parse(ClaimSchema, body),
  );

  if (!verifyClaimCode(code)) {
    throw createError({ status: 403, message: "Invalid claim code" });
  }

  if (await hasActiveAdmin()) {
    throw createError({ status: 409, message: "An admin already exists" });
  }

  const db = getDb();
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: pending.email ?? `admin+${pending.subject}@local`,
        displayName: pending.displayName ?? null,
        role: "admin",
        status: "active",
      },
    });
    await tx.userIdentity.create({
      data: {
        userId: created.id,
        provider: pending.provider,
        subject: pending.subject,
      },
    });
    return created;
  });

  clearClaimCode();
  await setUserSession(event, { user: buildAccountSessionUser(user) });

  return { ok: true };
});

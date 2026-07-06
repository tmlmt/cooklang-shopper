import * as v from "valibot";
import type { Role } from "~~/shared/types";

const CreateSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
  displayName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200))),
  role: v.picklist(["viewer", "editor", "admin"] satisfies Role[]),
});

export default defineEventHandler(async (event) => {
  await requireAdminRole(event);

  const body = await readValidatedBody(event, (b) => v.parse(CreateSchema, b));

  const db = getDb();
  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw createError({
      status: 409,
      message: "A user with this email already exists",
    });
  }

  const created = await db.user.create({
    data: {
      email: body.email,
      displayName: body.displayName ?? null,
      role: body.role,
      status: "invited",
    },
  });

  const token = await createInvitation(created.id);
  const inviteUrl = await buildInviteUrl(token);
  const emailed = await sendInvitationEmail(event, created.email, inviteUrl);

  const user = await db.user.findUniqueOrThrow({
    where: { id: created.id },
    ...userWithRelations,
  });

  return {
    user: serializeAdminUser(user),
    inviteUrl,
    emailed,
  };
});

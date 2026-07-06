import * as v from "valibot";
import type { Role } from "~~/shared/types";

const PatchSchema = v.object({
  role: v.optional(v.picklist(["viewer", "editor", "admin"] satisfies Role[])),
  displayName: v.optional(
    v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(200))),
  ),
});

export default defineEventHandler(async (event) => {
  await requireAdminRole(event);

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ status: 400, message: "Invalid user id" });
  }

  const body = await readValidatedBody(event, (b) => v.parse(PatchSchema, b));

  const db = getDb();
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    throw createError({ status: 404, message: "User not found" });
  }

  if (body.role) {
    await assertNotLastAdmin(id, body.role);
  }

  await db.user.update({
    where: { id },
    data: {
      role: body.role ?? undefined,
      displayName:
        body.displayName === undefined ? undefined : body.displayName,
    },
  });

  const user = await db.user.findUniqueOrThrow({
    where: { id },
    ...userWithRelations,
  });

  return { user: serializeAdminUser(user) };
});

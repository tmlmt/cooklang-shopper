import * as v from "valibot";
import type { AdminUsersResponse } from "~~/shared/types";

const QuerySchema = v.object({
  page: v.optional(v.pipe(v.unknown(), v.transform(Number), v.minValue(1)), 1),
  pageSize: v.optional(
    v.pipe(v.unknown(), v.transform(Number), v.minValue(1), v.maxValue(100)),
    20,
  ),
});

export default defineEventHandler(
  async (event): Promise<AdminUsersResponse> => {
    await requireAdminRole(event);

    const { page, pageSize } = await getValidatedQuery(event, (q) =>
      v.parse(QuerySchema, q),
    );

    const db = getDb();
    const [total, users] = await Promise.all([
      db.user.count(),
      db.user.findMany({
        ...userWithRelations,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      users: users.map(serializeAdminUser),
      total,
      page,
      pageSize,
    };
  },
);

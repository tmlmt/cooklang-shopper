import { getDb } from "./db";

export interface ShoppingShareContext {
  userKey: string;
  listName: string;
  ownerName: string;
  expiresAt: Date | null;
}

export async function resolveShoppingShareToken(
  token: string,
): Promise<ShoppingShareContext> {
  const db = getDb();
  const link = await db.shoppingListShareLink.findUnique({ where: { token } });

  if (!link) {
    throw createError({
      status: 404,
      statusText: "Share link not found",
    });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    throw createError({
      status: 410,
      statusText: "Share link has expired",
    });
  }

  return {
    userKey: link.userKey,
    listName: link.listName,
    ownerName: link.ownerName,
    expiresAt: link.expiresAt,
  };
}

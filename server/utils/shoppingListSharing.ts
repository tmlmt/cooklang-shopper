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
      statusCode: 404,
      statusMessage: "Share link not found",
    });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: "Share link has expired",
    });
  }

  return {
    userKey: link.userKey,
    listName: link.listName,
    ownerName: link.ownerName,
    expiresAt: link.expiresAt,
  };
}

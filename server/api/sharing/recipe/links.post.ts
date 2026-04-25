import { randomUUID } from "node:crypto";

export default defineEventHandler(async (event) => {
  await requireSharePermission(event);

  const body = await readBody(event);

  if (!body.recipePath || typeof body.recipePath !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "recipePath is required",
    });
  }

  const recipePath = body.recipePath.trim();

  // Verify recipe exists in the index
  const { getRecipeIndex } = await import("~~/server/utils/recipeIndex");
  const index = getRecipeIndex();
  if (!index.has(recipePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid expiresAt date",
      });
    }
    if (expiresAt <= new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: "expiresAt must be in the future",
      });
    }
  }

  const token = randomUUID();
  const db = getDb();

  const shareLink = await db.shareLink.create({
    data: {
      token,
      recipePath,
      expiresAt,
    },
  });

  return {
    id: shareLink.id,
    token: shareLink.token,
    recipePath: shareLink.recipePath,
    expiresAt: shareLink.expiresAt,
    createdAt: shareLink.createdAt,
  };
});

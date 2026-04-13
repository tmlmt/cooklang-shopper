import { Recipe } from "@tmlmt/cooklang-parser";
import { buildImageManifest } from "~~/server/utils/recipeImages";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: "Token is required",
    });
  }

  const db = getDb();
  const shareLink = await db.shareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    throw createError({
      statusCode: 404,
      statusMessage: "Share link not found",
    });
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: "Share link has expired",
    });
  }

  // Convert recipePath (colon-separated) to file path (slash-separated)
  const filePath = shareLink.recipePath.replace(/:/g, "/");

  const storage = useStorage("recipes");
  const content = await storage.getItem(`${filePath}.cook`);

  if (!content) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  const raw = String(content);
  const parsed = new Recipe(raw);
  const imageManifest = await buildImageManifest(
    filePath,
    parsed.metadata as Record<string, unknown>,
  );

  return {
    recipePath: shareLink.recipePath,
    raw,
    metadata: parsed.metadata,
    ingredients: parsed.ingredients,
    expiresAt: shareLink.expiresAt,
    imageManifest,
  };
});

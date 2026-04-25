import { Recipe } from "@tmlmt/cooklang-parser";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({
      status: 400,
      statusText: "Token is required",
    });
  }

  const db = getDb();
  const shareLink = await db.shareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    throw createError({
      status: 404,
      statusText: "Share link not found",
    });
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    throw createError({
      status: 410,
      statusText: "Share link has expired",
    });
  }

  // Convert recipePath (colon-separated) to file path (slash-separated)
  const filePath = shareLink.recipePath.replace(/:/g, "/");

  const storage = useStorage("recipes");
  const content = await storage.getItem(`${filePath}.cook`);

  if (!content) {
    throw createError({
      status: 404,
      statusText: "Recipe not found",
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

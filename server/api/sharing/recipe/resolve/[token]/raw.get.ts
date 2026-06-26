export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({ status: 400, statusText: "Token is required" });
  }

  const db = getDb();
  const shareLink = await db.shareLink.findUnique({ where: { token } });

  if (!shareLink) {
    throw createError({ status: 404, statusText: "Share link not found" });
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    throw createError({ status: 410, statusText: "Share link has expired" });
  }

  const query = getQuery(event);
  const requestedLocale =
    typeof query.locale === "string" && isValidLangCode(query.locale)
      ? query.locale
      : undefined;

  const fileKey = await selectRecipeFileKey(
    shareLink.recipePath,
    requestedLocale,
  );

  const filePath = shareLink.recipePath.replace(/:/g, "/");
  const storage = useStorage("recipes");
  const resolvedFilePath = fileKey ? fileKey.replace(/:/g, "/") : filePath;
  const content = await storage.getItem(resolvedFilePath + ".cook");

  if (!content) {
    throw createError({ status: 404, statusText: "Recipe not found" });
  }

  setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
  return String(content);
});

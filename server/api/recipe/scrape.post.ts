export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const { url } = await readBody<{ url: string }>(event);

  if (!url || typeof url !== "string") {
    throw createError({ status: 400, message: "url is required" });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw createError({ status: 400, message: "Invalid URL" });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw createError({
      status: 400,
      message: "Only http/https URLs are supported",
    });
  }

  const text = await scrapeRecipeText(url);
  return { text };
});

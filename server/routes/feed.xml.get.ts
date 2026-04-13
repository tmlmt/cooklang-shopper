import { getAppConfig } from "#server/utils/appConfig";

export default defineEventHandler(async (event) => {
  const config = await getAppConfig();
  const federation = config.sharing?.federation;

  if (!federation?.enabled) {
    throw createError({
      statusCode: 404,
      statusMessage: "Atom feed not enabled",
    });
  }

  const baseUrl = federation.baseUrl.replace(/\/$/, "");

  // Get all public recipe paths
  const publicPaths = await getPublicRecipePaths();
  const { getRecipeIndex } = await import("~~/server/utils/recipeIndex");
  const index = getRecipeIndex();

  // Build entries from public recipes
  const entries: string[] = [];
  let latestUpdated = "";

  for (const recipePath of publicPaths) {
    const recipe = index.get(recipePath);
    if (!recipe) continue;

    const filePath = recipePath.replace(/:/g, "/");
    const recipeUrl = `${baseUrl}/recipe/${filePath}`;
    const rawUrl = `${baseUrl}/api/public/recipe/${filePath}`;
    const updated = recipe.lastModified || new Date().toISOString();

    if (updated > latestUpdated) latestUpdated = updated;

    const summary =
      recipe.description ||
      `A ${escapeXml(recipe.title || recipe.name)} recipe.`;

    let entryContent = `    <entry>
      <title>${escapeXml(recipe.title || recipe.name)}</title>
      <id>${escapeXml(recipeUrl)}</id>
      <link rel="alternate" href="${escapeXml(recipeUrl)}" />
      <link rel="enclosure" type="text/plain" href="${escapeXml(rawUrl)}" />
      <updated>${escapeXml(updated)}</updated>
      <summary>${escapeXml(summary)}</summary>`;

    if (recipe.author) {
      entryContent += `
      <author><name>${escapeXml(recipe.author)}</name></author>`;
    }

    // Cooklang namespace extension elements
    const cooklangParts: string[] = [];

    if (recipe.servings) {
      cooklangParts.push(
        `        <cooklang:servings>${recipe.servings}</cooklang:servings>`,
      );
    }

    if (recipe.tags && recipe.tags.length > 0) {
      const tagElements = recipe.tags
        .map((t) => `          <cooklang:tag>${escapeXml(t)}</cooklang:tag>`)
        .join("\n");
      cooklangParts.push(
        `        <cooklang:tags>\n${tagElements}\n        </cooklang:tags>`,
      );
    }

    if (
      recipe.difficulty &&
      ["easy", "medium", "hard"].includes(recipe.difficulty)
    ) {
      cooklangParts.push(
        `        <cooklang:difficulty>${escapeXml(recipe.difficulty)}</cooklang:difficulty>`,
      );
    }

    if (typeof recipe.times?.total === "number") {
      cooklangParts.push(
        `        <cooklang:time total="${recipe.times.total}" units="minutes"/>`,
      );
    }

    // Add cover image if available (metadata-based images are not available
    // here, but filesystem-based implicit cover images are discovered)
    const imageManifest = await buildImageManifest(
      recipePath.replace(/:/g, "/"),
      {},
    );
    if (imageManifest.coverImage) {
      cooklangParts.push(
        `        <cooklang:image>${escapeXml(`${baseUrl}${imageManifest.coverImage}`)}</cooklang:image>`,
      );
    }

    if (cooklangParts.length > 0) {
      entryContent += `
      <cooklang:recipe>\n${cooklangParts.join("\n")}\n      </cooklang:recipe>`;
    }

    entryContent += `
    </entry>`;
    entries.push(entryContent);
  }

  if (!latestUpdated) latestUpdated = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cooklang="https://cooklang.org/feeds/1.0">
  <title>${escapeXml(federation.feedTitle)}</title>
  <link href="${escapeXml(baseUrl)}" />
  <link rel="self" href="${escapeXml(baseUrl)}/feed.xml" />
  <id>${escapeXml(baseUrl)}/</id>
  <updated>${escapeXml(latestUpdated)}</updated>
  <author>
    <name>${escapeXml(federation.feedAuthor)}</name>
  </author>
${entries.join("\n")}
</feed>`;

  setResponseHeader(
    event,
    "content-type",
    "application/atom+xml; charset=utf-8",
  );
  return xml;
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

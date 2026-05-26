import { type Metadata, Recipe } from "@tmlmt/cooklang-parser";
import type { SitemapUrlInput } from "#sitemap/types";

export default defineSitemapEventHandler(async () => {
  const config = await getAppConfig();
  const baseUrl = (config.baseUrl || "").replace(/\/$/, "");

  const publicPaths = await getPublicRecipePaths();
  const index = getRecipeIndex();
  const storage = useStorage("recipes");

  const urls: SitemapUrlInput[] = [];

  for (const recipePath of publicPaths) {
    const entry = index.get(recipePath);
    if (!entry) continue;

    const filePath = recipePath.replace(/:/g, "/");
    const raw = await storage.getItem(`${filePath}.cook`);
    const metadata = raw ? (new Recipe(String(raw)).metadata as Metadata) : {};

    const manifest = await buildImageManifest(filePath, metadata);
    const allImages = [
      ...manifest.heroImages,
      ...Object.values(manifest.stepImagesByNumber),
    ];

    const images =
      baseUrl && allImages.length > 0
        ? allImages.map((p) => ({
            loc: p.startsWith("http") ? p : `${baseUrl}${p}`,
          }))
        : [];

    urls.push({
      loc: `/recipe/${filePath}`,
      lastmod: entry.lastModified,
      ...(images.length > 0 ? { images } : {}),
    });
  }

  const latestLastmod = urls.reduce<string | undefined>((latest, url) => {
    if (typeof url === "string") return latest;
    const mod = url.lastmod as string | undefined;
    if (!mod) return latest;
    return latest === undefined || mod > latest ? mod : latest;
  }, undefined);

  urls.push({ loc: "/", lastmod: latestLastmod });

  return urls;
});

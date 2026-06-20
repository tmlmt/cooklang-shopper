import { readdir, stat } from "node:fs/promises";
import * as nodePath from "node:path";
import type { RecipeImageManifest } from "~~/shared/types";
import { Recipe } from "@tmlmt/cooklang-parser";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

export const recipesRoot = nodePath.resolve(process.cwd(), "public", "recipes");

export function toWebPathFromFsPath(fsPath: string): string | undefined {
  const relative = nodePath.relative(recipesRoot, fsPath);

  if (
    relative.startsWith("..") ||
    nodePath.isAbsolute(relative) ||
    relative.length === 0
  ) {
    return undefined;
  }

  return `/recipes/${relative.split(nodePath.sep).join("/")}`;
}

/**
 * Discover all image files associated with a recipe in the given directory.
 * Returns an object with categorized images and the raw list of absolute fs paths.
 *
 * Strips any language code suffix from recipeName before building the prefix,
 * so that images are shared across all language variants of a recipe.
 * e.g. recipeName "pasta.en" → prefix "pasta."
 */
export async function discoverRecipeImages(
  recipeDirFsPath: string,
  recipeName: string,
): Promise<{
  cover: string | undefined;
  steps: Record<string, string>;
  all: string[];
}> {
  const dirEntries = await readdir(recipeDirFsPath, { withFileTypes: true });

  // Strip language code suffix if present (e.g. "pasta.en" → "pasta")
  const { baseKey: baseName } = parseRecipeKey(recipeName);
  const prefix = baseName.toLowerCase() + ".";

  let cover: string | undefined;
  const steps: Record<string, string> = {};
  const all: string[] = [];

  for (const entry of dirEntries) {
    if (!entry.isFile()) continue;

    const lowerName = entry.name.toLowerCase();
    const ext = nodePath.extname(entry.name).slice(1).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;
    if (!lowerName.startsWith(prefix)) continue;

    const fsPath = nodePath.join(recipeDirFsPath, entry.name);
    all.push(fsPath);

    // Check if it's the cover image: {baseName}.{ext}
    const expectedCover = `${baseName}.${ext}`.toLowerCase();
    if (lowerName === expectedCover && !cover) {
      cover = fsPath;
      continue;
    }

    // Check if it's a step image: {recipeName}.{N}.{ext}
    const suffix = `.${ext}`;
    const stepChunk = lowerName.slice(prefix.length, -suffix.length);
    if (/^\d+$/.test(stepChunk)) {
      const stepNumber = String(Number(stepChunk));
      if (!steps[stepNumber]) {
        steps[stepNumber] = fsPath;
      }
    }
  }

  return { cover, steps, all };
}

/**
 * Find existing image file(s) for a given role.
 * role: "cover" or "step-{N}" (e.g. "step-3")
 * Returns the absolute fs paths of matching files (can be multiple extensions).
 */
export async function findExistingImagesForRole(
  recipeDirFsPath: string,
  recipeName: string,
  role: string,
): Promise<string[]> {
  const discovered = await discoverRecipeImages(recipeDirFsPath, recipeName);

  if (role === "cover") {
    return discovered.cover ? [discovered.cover] : [];
  }

  const stepMatch = role.match(/^step-(\d+)$/);
  if (stepMatch) {
    const stepNum = stepMatch[1]!;
    return discovered.steps[stepNum] ? [discovered.steps[stepNum]] : [];
  }

  return [];
}

const IMAGE_METADATA_KEYS = new Set(["image", "images", "picture", "pictures"]);

function collectMetadataImageValues(
  metadata: Record<string, unknown>,
): string[] {
  const values: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (!IMAGE_METADATA_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string") {
      values.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") values.push(item);
      }
    }
  }
  return values;
}

async function resolveLocalMetadataImage(
  imageValue: string,
  recipeDirFsPath: string,
): Promise<string | undefined> {
  let fsPath: string;
  if (imageValue.startsWith("/recipes/")) {
    fsPath = nodePath.resolve(
      recipesRoot,
      imageValue.slice("/recipes/".length),
    );
  } else if (imageValue.startsWith("/")) {
    fsPath = nodePath.resolve(recipesRoot, imageValue.slice(1));
  } else {
    fsPath = nodePath.resolve(recipeDirFsPath, imageValue);
  }

  if (
    !fsPath.startsWith(recipesRoot + nodePath.sep) &&
    fsPath !== recipesRoot
  ) {
    return undefined;
  }

  try {
    const fileStat = await stat(fsPath);
    if (!fileStat.isFile()) return undefined;
  } catch {
    return undefined;
  }

  return toWebPathFromFsPath(fsPath);
}

async function normalizeMetadataImage(
  rawValue: unknown,
  recipeDirFsPath: string,
): Promise<string | undefined> {
  if (typeof rawValue !== "string") return undefined;
  const imageValue = rawValue.trim();
  if (!imageValue) return undefined;
  if (imageValue.startsWith("http://") || imageValue.startsWith("https://")) {
    return imageValue;
  }
  return resolveLocalMetadataImage(imageValue, recipeDirFsPath);
}

function dedupeInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      deduped.push(value);
    }
  }
  return deduped;
}

export async function buildImageManifest(
  recipePath: string,
  metadata: Record<string, unknown>,
): Promise<RecipeImageManifest> {
  const recipeFsPath = nodePath.join(
    process.cwd(),
    "public",
    "recipes",
    `${recipePath}.cook`,
  );
  const recipeDirFsPath = nodePath.dirname(recipeFsPath);
  const recipeName = nodePath.basename(recipePath);

  let dirEntries;
  try {
    dirEntries = await readdir(recipeDirFsPath, { withFileTypes: true });
  } catch {
    return { heroImages: [], stepImagesByNumber: {}, hasImages: false };
  }

  const imageFiles = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const ext = nodePath.extname(name).slice(1).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });

  const filesByLowerName = new Map<string, string>();
  for (const name of imageFiles) {
    filesByLowerName.set(name.toLowerCase(), name);
  }

  // Implicit cover image
  let implicitCoverImage: string | undefined;
  for (const ext of IMAGE_EXTENSIONS) {
    const lowerName = `${recipeName}.${ext}`.toLowerCase();
    const actualName = filesByLowerName.get(lowerName);
    if (!actualName) continue;
    const fsPath = nodePath.join(recipeDirFsPath, actualName);
    const webPath = toWebPathFromFsPath(fsPath);
    if (webPath) {
      implicitCoverImage = webPath;
      break;
    }
  }

  // Step images
  const stepPrefix = `${recipeName.toLowerCase()}.`;
  const stepImagesByNumber: Record<string, string> = {};
  for (const [lowerName, actualName] of filesByLowerName.entries()) {
    if (!lowerName.startsWith(stepPrefix)) continue;
    for (const ext of IMAGE_EXTENSIONS) {
      const suffix = `.${ext}`;
      if (!lowerName.endsWith(suffix)) continue;
      const stepChunk = lowerName.slice(stepPrefix.length, -suffix.length);
      if (!/^\d+$/.test(stepChunk)) continue;
      const stepNumber = Number(stepChunk);
      if (!Number.isInteger(stepNumber) || stepNumber <= 0) continue;
      if (stepImagesByNumber[String(stepNumber)]) break;
      const fsPath = nodePath.join(recipeDirFsPath, actualName);
      const webPath = toWebPathFromFsPath(fsPath);
      if (webPath) stepImagesByNumber[String(stepNumber)] = webPath;
      break;
    }
  }

  // Metadata images
  const metadataImageValues = collectMetadataImageValues(metadata);
  const resolvedMetadataImages = (
    await Promise.all(
      metadataImageValues.map((value) =>
        normalizeMetadataImage(value, recipeDirFsPath),
      ),
    )
  ).filter((value): value is string => Boolean(value));

  const heroImages = dedupeInOrder([
    ...resolvedMetadataImages,
    ...(implicitCoverImage ? [implicitCoverImage] : []),
  ]);

  return {
    coverImage: heroImages[0],
    heroImages,
    stepImagesByNumber,
    hasImages:
      heroImages.length > 0 || Object.keys(stepImagesByNumber).length > 0,
  };
}

/**
 * Authorizes access to a recipe image asset whose filename does not match its
 * recipe's filename (e.g. images referenced via the `images:` metadata field,
 * which can be named arbitrarily).
 *
 * Scans the .cook recipes in the asset's directory and returns true if the
 * asset appears in the image manifest of any recipe that is public or has an
 * active (non-expired) share link. Used as a fallback by the static-asset
 * protection middleware after the filename-derived recipe key fails to match.
 */
export async function isRecipeAssetPubliclyViewable(
  requestWebPath: string,
): Promise<boolean> {
  if (!requestWebPath.startsWith("/recipes/")) return false;

  const relative = requestWebPath.slice("/recipes/".length);
  const dirRelative = nodePath.dirname(relative);
  const dirFsPath =
    dirRelative === "." ? recipesRoot : nodePath.join(recipesRoot, dirRelative);

  let dirEntries;
  try {
    dirEntries = await readdir(dirFsPath, { withFileTypes: true });
  } catch {
    return false;
  }

  // Collect the base recipe key (colon-separated, locale stripped) of each
  // .cook variant in the directory.
  const baseKeys = new Set<string>();
  for (const entry of dirEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".cook")) continue;
    const fileKey =
      (dirRelative === "." ? "" : `${dirRelative}/`) +
      entry.name.slice(0, -".cook".length);
    baseKeys.add(parseRecipeKey(fileKey.replace(/\//g, ":")).baseKey);
  }

  const db = getDb();
  const storage = useStorage("recipes");

  for (const baseKey of baseKeys) {
    const isPublic = await isRecipePublic(baseKey);
    let viewable = isPublic;
    if (!viewable) {
      const activeShareLink = await db.shareLink.findFirst({
        where: {
          recipePath: baseKey,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      viewable = Boolean(activeShareLink);
    }
    if (!viewable) continue;

    const baseFilePath = baseKey.replace(/:/g, "/");
    const content = await storage.getItem(`${baseFilePath}.cook`);
    if (!content) continue;

    let metadata: Record<string, unknown>;
    try {
      metadata = new Recipe(String(content)).metadata as Record<
        string,
        unknown
      >;
    } catch {
      continue;
    }

    const manifest = await buildImageManifest(baseFilePath, metadata);
    const assets = [
      ...(manifest.coverImage ? [manifest.coverImage] : []),
      ...manifest.heroImages,
      ...Object.values(manifest.stepImagesByNumber),
    ];
    if (assets.includes(requestWebPath)) return true;
  }

  return false;
}

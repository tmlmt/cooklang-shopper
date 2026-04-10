import { readdir } from "node:fs/promises";
import * as nodePath from "node:path";

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
  const prefix = recipeName.toLowerCase() + ".";

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

    // Check if it's the cover image: {recipeName}.{ext}
    const expectedCover = `${recipeName}.${ext}`.toLowerCase();
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

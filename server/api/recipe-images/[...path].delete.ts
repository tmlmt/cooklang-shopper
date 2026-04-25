import { stat, unlink } from "node:fs/promises";
import * as nodePath from "node:path";
import type { RecipeImageManifest } from "~~/shared/types";

export default defineEventHandler(
  async (event): Promise<RecipeImageManifest> => {
    await requireEditorRole(event);

    const decodedPath = getValidatedRecipePath(event);

    const body = await readBody<{ imagePath?: string }>(event);
    if (!body?.imagePath || typeof body.imagePath !== "string") {
      throw createError({
        status: 400,
        statusText: "imagePath is required",
      });
    }

    const imagePath = body.imagePath.trim();

    // Convert web path to filesystem path
    if (!imagePath.startsWith("/recipes/")) {
      throw createError({
        status: 400,
        statusText: "Invalid image path",
      });
    }

    const relativePath = imagePath.slice("/recipes/".length);
    const fsPath = nodePath.resolve(recipesRoot, relativePath);

    // Security: ensure the path stays within recipesRoot
    if (
      !fsPath.startsWith(recipesRoot + nodePath.sep) &&
      fsPath !== recipesRoot
    ) {
      throw createError({
        status: 400,
        statusText: "Invalid image path",
      });
    }

    // Validate it's an image file
    const ext = nodePath.extname(fsPath).slice(1).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) {
      throw createError({
        status: 400,
        statusText: "Not an image file",
      });
    }

    // Verify the file exists
    try {
      const fileStat = await stat(fsPath);
      if (!fileStat.isFile()) {
        throw createError({
          status: 404,
          statusText: "Image not found",
        });
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error) throw error;
      throw createError({
        status: 404,
        statusText: "Image not found",
      });
    }

    // Delete the file
    await unlink(fsPath);

    // Return updated manifest
    const recipeFsPath = nodePath.join(
      process.cwd(),
      "public",
      "recipes",
      `${decodedPath}.cook`,
    );
    const recipeDirFsPath = nodePath.dirname(recipeFsPath);
    const recipeName = nodePath.basename(decodedPath);

    const discovered = await discoverRecipeImages(recipeDirFsPath, recipeName);

    const coverWebPath = discovered.cover
      ? toWebPathFromFsPath(discovered.cover)
      : undefined;
    const stepWebPaths: Record<string, string> = {};
    for (const [num, fp] of Object.entries(discovered.steps)) {
      const webPath = toWebPathFromFsPath(fp);
      if (webPath) stepWebPaths[num] = webPath;
    }

    const heroImages = coverWebPath ? [coverWebPath] : [];

    return {
      coverImage: coverWebPath,
      heroImages,
      stepImagesByNumber: stepWebPaths,
      hasImages: heroImages.length > 0 || Object.keys(stepWebPaths).length > 0,
    };
  },
);

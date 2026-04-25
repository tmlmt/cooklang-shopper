import { unlink, writeFile } from "node:fs/promises";
import * as nodePath from "node:path";
import type { RecipeImageManifest } from "~~/shared/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default defineEventHandler(
  async (event): Promise<RecipeImageManifest> => {
    await requireEditorRole(event);

    const decodedPath = getValidatedRecipePath(event);

    // Verify the recipe exists
    const storage = useStorage("recipes");
    const content = await storage.getItem(`${decodedPath}.cook`);
    if (!content) {
      throw createError({
        status: 404,
        statusText: "Recipe not found",
      });
    }

    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      throw createError({
        status: 400,
        statusText: "No form data provided",
      });
    }

    // Extract fields
    let filePart: (typeof formData)[number] | undefined;
    let role: string | undefined;

    for (const part of formData) {
      if (part.name === "file") filePart = part;
      if (part.name === "role") role = part.data.toString("utf-8").trim();
    }

    if (!filePart || !filePart.data || filePart.data.length === 0) {
      throw createError({
        status: 400,
        statusText: "No file provided",
      });
    }

    if (!role) {
      throw createError({
        status: 400,
        statusText: "No role provided (expected 'cover' or 'step-N')",
      });
    }

    // Validate role format
    if (role !== "cover" && !/^step-\d+$/.test(role)) {
      throw createError({
        status: 400,
        statusText: "Invalid role. Expected 'cover' or 'step-N'",
      });
    }

    // Validate file size
    if (filePart.data.length > MAX_FILE_SIZE) {
      throw createError({
        status: 413,
        statusText: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Validate file extension from filename or content-type
    const originalFilename = filePart.filename ?? "";
    const ext = nodePath.extname(originalFilename).slice(1).toLowerCase();
    if (!ext || !IMAGE_EXTENSIONS.includes(ext)) {
      throw createError({
        status: 400,
        statusText: `Invalid file type. Allowed: ${IMAGE_EXTENSIONS.join(", ")}`,
      });
    }

    // Compute target filename
    const recipeFsPath = nodePath.join(
      process.cwd(),
      "public",
      "recipes",
      `${decodedPath}.cook`,
    );
    const recipeDirFsPath = nodePath.dirname(recipeFsPath);
    const recipeName = nodePath.basename(decodedPath);

    let targetFilename: string;
    if (role === "cover") {
      targetFilename = `${recipeName}.${ext}`;
    } else {
      const stepNumber = role.split("-")[1];
      targetFilename = `${recipeName}.${stepNumber}.${ext}`;
    }

    const targetPath = nodePath.resolve(recipeDirFsPath, targetFilename);

    // Security: ensure target stays within recipesRoot
    if (
      !targetPath.startsWith(recipesRoot + nodePath.sep) &&
      targetPath !== recipesRoot
    ) {
      throw createError({
        status: 400,
        statusText: "Invalid target path",
      });
    }

    // Remove existing image(s) for this role (may have different extension)
    const existing = await findExistingImagesForRole(
      recipeDirFsPath,
      recipeName,
      role,
    );
    for (const existingPath of existing) {
      if (existingPath !== targetPath) {
        await unlink(existingPath);
      }
    }

    // Write the new file
    await writeFile(targetPath, filePart.data);

    // Return updated manifest
    const discovered = await discoverRecipeImages(recipeDirFsPath, recipeName);

    const coverWebPath = discovered.cover
      ? toWebPathFromFsPath(discovered.cover)
      : undefined;
    const stepWebPaths: Record<string, string> = {};
    for (const [num, fsPath] of Object.entries(discovered.steps)) {
      const webPath = toWebPathFromFsPath(fsPath);
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

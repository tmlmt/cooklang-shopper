import { rename, cp, rm } from "node:fs/promises";
import * as nodePath from "node:path";
import { glob } from "glob";
import { moveInRecipeIndex } from "~~/server/utils/recipeIndex";
import { validateRecipeDir } from "~~/server/utils/validateRecipePath";
import { moveVisibilityAndLinksForDirectory } from "~~/server/utils/recipeVisibility";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const decodedPath = getValidatedRecipePath(event);

  const body = await readBody(event);
  if (body.destination === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "No destination directory was provided",
    });
  }
  validateRecipeDir(body.destination.trim());

  const recipesRoot = nodePath.resolve(process.cwd(), "public", "recipes");
  const sourceDir = nodePath.resolve(recipesRoot, decodedPath);
  const folderName = nodePath.basename(sourceDir);
  const destinationParent = nodePath.resolve(
    recipesRoot,
    body.destination.trim(),
  );
  const destinationDir = nodePath.resolve(destinationParent, folderName);

  // Security: ensure both paths stay within recipes root
  for (const dir of [sourceDir, destinationDir]) {
    if (!dir.startsWith(recipesRoot + nodePath.sep) && dir !== recipesRoot) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid directory path",
      });
    }
  }

  // Prevent moving a folder into itself or its own subdirectory
  if (
    destinationDir === sourceDir ||
    destinationDir.startsWith(sourceDir + nodePath.sep)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cannot move a folder into itself or its own subdirectory",
    });
  }

  // Collect all .cook files for index update before moving
  const cookFiles = await glob("**/*.cook", { cwd: sourceDir });
  const oldRelativePath = decodedPath;
  const newRelativePath = body.destination.trim()
    ? `${body.destination.trim()}/${folderName}`
    : folderName;

  // Move the directory
  try {
    await rename(sourceDir, destinationDir);
  } catch {
    // Cross-device fallback: copy then delete
    await cp(sourceDir, destinationDir, { recursive: true });
    await rm(sourceDir, { recursive: true });
  }

  // Update recipe index in-memory: rekey entries with new paths
  for (const file of cookFiles) {
    const oldKey = nodePath
      .join(oldRelativePath, file)
      .replace(/\//g, ":")
      .replace(/\.cook$/, "");
    const newKey = nodePath
      .join(newRelativePath, file)
      .replace(/\//g, ":")
      .replace(/\.cook$/, "");
    const fileDir = nodePath.dirname(nodePath.join(newRelativePath, file));
    moveInRecipeIndex(oldKey, newKey, fileDir === "." ? "" : fileDir);
  }

  // Update visibility overrides and share links for moved directory
  const oldDirPrefix = oldRelativePath.replace(/\//g, ":");
  const newDirPrefix = newRelativePath.replace(/\//g, ":");
  await moveVisibilityAndLinksForDirectory(oldDirPrefix, newDirPrefix);

  return { newPath: newRelativePath };
});

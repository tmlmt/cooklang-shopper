import { rename, cp, rm } from "node:fs/promises";
import * as nodePath from "node:path";
import { glob } from "glob";
import { moveInRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const decodedPath = getValidatedRecipePath(event);

  const body = await readBody(event);
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No new name was provided",
    });
  }
  if (body.name.includes("/") || body.name.includes("\\")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Folder name must not contain path separators",
    });
  }

  const recipesRoot = nodePath.resolve(process.cwd(), "public", "recipes");
  const sourceDir = nodePath.resolve(recipesRoot, decodedPath);
  const parentDir = nodePath.dirname(sourceDir);
  const newName = body.name.trim();
  const renamedDir = nodePath.resolve(parentDir, newName);

  // Security: ensure both paths stay within recipes root
  for (const dir of [sourceDir, renamedDir]) {
    if (!dir.startsWith(recipesRoot + nodePath.sep) && dir !== recipesRoot) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid directory path",
      });
    }
  }

  if (sourceDir === renamedDir) {
    return { newPath: decodedPath };
  }

  // Collect all .cook files for index update before renaming
  const cookFiles = await glob("**/*.cook", { cwd: sourceDir });
  const parentRelativePath = nodePath.relative(recipesRoot, parentDir);
  const newRelativePath = parentRelativePath
    ? `${parentRelativePath}/${newName}`
    : newName;

  // Rename the directory
  try {
    await rename(sourceDir, renamedDir);
  } catch {
    // Cross-device fallback
    await cp(sourceDir, renamedDir, { recursive: true });
    await rm(sourceDir, { recursive: true });
  }

  // Update recipe index in-memory: rekey entries with new paths
  for (const file of cookFiles) {
    const oldKey = nodePath
      .join(decodedPath, file)
      .replace(/\//g, ":")
      .replace(/\.cook$/, "");
    const newKey = nodePath
      .join(newRelativePath, file)
      .replace(/\//g, ":")
      .replace(/\.cook$/, "");
    const fileDir = nodePath.dirname(nodePath.join(newRelativePath, file));
    moveInRecipeIndex(oldKey, newKey, fileDir === "." ? "" : fileDir);
  }

  return { newPath: newRelativePath };
});

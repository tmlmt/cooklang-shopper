import { copyFile, rename, unlink } from "node:fs/promises";
import * as nodePath from "node:path";
import {
  deleteFromRecipeIndex,
  updateRecipeIndex,
} from "~~/server/utils/recipeIndex";
import {
  discoverRecipeImages,
  recipesRoot,
} from "~~/server/utils/recipeImages";
import { moveRecipeVisibilityAndLinks } from "~~/server/utils/recipeVisibility";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const decodedPath = getValidatedRecipePath(event);

  // Checking whether a recipe body was provided
  const body = await readBody(event);
  if (body.fileName === undefined || body.dir === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "No data to patch was provided for the recipe",
    });
  }
  if (body.fileName.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "An empty filename was provided",
    });
  }
  if (body.fileName.includes("/")) {
    throw createError({
      statusCode: 400,
      statusMessage: "A recipe filename cannot contain '/'",
    });
  }

  validateRecipeDir(body.dir);

  // Saving
  const storage = useStorage("recipes");
  const oldRecipeKey = decodedPath.replace(/\//g, ":");
  const content = (await storage.getItem(oldRecipeKey + ".cook")) as string;
  if (!content) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }
  await storage.removeItem(oldRecipeKey + ".cook");
  deleteFromRecipeIndex(oldRecipeKey);

  const dir = body.dir;
  const fileName = body.fileName;
  const newRecipeKey = (dir ? `${dir}/${fileName}` : fileName).replace(
    /\//g,
    ":",
  );
  await storage.setItem(newRecipeKey + ".cook", content);
  await updateRecipeIndex(newRecipeKey, content);

  // Update visibility overrides and share links to new path
  await moveRecipeVisibilityAndLinks(oldRecipeKey, newRecipeKey);

  // Move associated images
  const oldRecipeName = nodePath.basename(decodedPath);
  const oldRecipeDirFsPath = nodePath.join(
    recipesRoot,
    nodePath.dirname(decodedPath),
  );
  const newRecipeDirFsPath = dir
    ? nodePath.join(recipesRoot, dir)
    : recipesRoot;

  try {
    const discovered = await discoverRecipeImages(
      oldRecipeDirFsPath,
      oldRecipeName,
    );

    for (const oldFsPath of discovered.all) {
      const oldBasename = nodePath.basename(oldFsPath);
      // Replace old recipe name prefix with new recipe name
      const newBasename = fileName + oldBasename.slice(oldRecipeName.length);
      const newFsPath = nodePath.join(newRecipeDirFsPath, newBasename);

      // Security: ensure target stays within recipesRoot
      if (
        !newFsPath.startsWith(recipesRoot + nodePath.sep) &&
        newFsPath !== recipesRoot
      ) {
        continue;
      }

      try {
        await rename(oldFsPath, newFsPath);
      } catch {
        // Cross-device move: copy + delete
        await copyFile(oldFsPath, newFsPath);
        await unlink(oldFsPath);
      }
    }
  } catch {
    // Image move is best-effort — don't fail the recipe move
  }

  return "Recipe saved";
});

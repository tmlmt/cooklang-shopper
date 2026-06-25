import { copyFile, rename, unlink } from "node:fs/promises";
import * as nodePath from "node:path";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const decodedPath = getValidatedRecipePath(event);

  // Checking whether a recipe body was provided
  const body = await readBody(event);
  if (body.fileName === undefined || body.dir === undefined) {
    throw createError({
      status: 400,
      statusText: "No data to patch was provided for the recipe",
    });
  }
  if (body.fileName.trim().length === 0) {
    throw createError({
      status: 400,
      statusText: "An empty filename was provided",
    });
  }
  if (body.fileName.includes("/")) {
    throw createError({
      status: 400,
      statusText: "A recipe filename cannot contain '/'",
    });
  }

  validateRecipeDir(body.dir);

  // Saving
  const storage = useStorage("recipes");
  const oldRecipeKey = decodedPath.replace(/\//g, ":");
  const content = (await storage.getItem(oldRecipeKey + ".cook")) as string;
  if (!content) {
    throw createError({
      status: 404,
      statusText: "Recipe not found",
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

  // Move associated images. Only managed cover/step files are renamed to the
  // new recipe base name; metadata-referenced files keep their basename.
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

    const managedImagePaths = new Set<string>([
      ...(discovered.cover ? [discovered.cover] : []),
      ...Object.values(discovered.steps),
    ]);

    for (const oldFsPath of discovered.all) {
      const oldBasename = nodePath.basename(oldFsPath);
      const shouldRenameBasename = managedImagePaths.has(oldFsPath);
      const newBasename = shouldRenameBasename
        ? fileName + oldBasename.slice(oldRecipeName.length)
        : oldBasename;
      const newFsPath = nodePath.join(newRecipeDirFsPath, newBasename);

      if (newFsPath === oldFsPath) {
        continue;
      }

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

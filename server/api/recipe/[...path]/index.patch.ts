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

  const storage = useStorage("recipes");
  const oldBaseKey = decodedPath.replace(/\//g, ":");
  const dir: string = body.dir;
  const fileName: string = body.fileName;
  const newBaseKey = (dir ? `${dir}/${fileName}` : fileName).replace(
    /\//g,
    ":",
  );

  // Collect all variant file keys for this recipe (default + language codes)
  const { hasDefault, langCodes } = getVariantsForBase(oldBaseKey);
  const filePairs: { oldKey: string; newKey: string }[] = [];
  if (hasDefault) filePairs.push({ oldKey: oldBaseKey, newKey: newBaseKey });
  for (const lang of langCodes) {
    filePairs.push({
      oldKey: `${oldBaseKey}.${lang}`,
      newKey: `${newBaseKey}.${lang}`,
    });
  }
  // Edge case: file exists on disk but was not in the tracker
  if (filePairs.length === 0)
    filePairs.push({ oldKey: oldBaseKey, newKey: newBaseKey });

  // Verify that at least the default (or first) file exists
  const firstContent = (await storage.getItem(
    filePairs[0]!.oldKey + ".cook",
  )) as string | null;
  if (!firstContent) {
    throw createError({
      status: 404,
      statusText: "Recipe not found",
    });
  }

  // Move every variant in storage and update the index
  for (const { oldKey, newKey } of filePairs) {
    const content = (await storage.getItem(oldKey + ".cook")) as string | null;
    if (!content) continue;
    await storage.removeItem(oldKey + ".cook");
    deleteFromRecipeIndex(oldKey + ".cook");
    await storage.setItem(newKey + ".cook", content);
    await updateRecipeIndex(newKey + ".cook", content);
  }

  // Update visibility overrides and share links (once, using base keys)
  await moveRecipeVisibilityAndLinks(oldBaseKey, newBaseKey);

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

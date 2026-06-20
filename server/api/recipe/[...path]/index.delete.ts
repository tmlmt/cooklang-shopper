import { unlink } from "node:fs/promises";
import * as nodePath from "node:path";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const decodedPath = getValidatedRecipePath(event);

  const storage = useStorage("recipes");
  const recipeKey = decodedPath.replace(/\//g, ":");

  // Collect all variant file keys for this recipe (default + language codes)
  const { hasDefault, langCodes } = getVariantsForBase(recipeKey);
  const fileKeys: string[] = [];
  if (hasDefault) fileKeys.push(recipeKey);
  for (const lang of langCodes) fileKeys.push(`${recipeKey}.${lang}`);
  // Edge case: file exists on disk but was never indexed (e.g. manual drop)
  if (fileKeys.length === 0) fileKeys.push(recipeKey);

  // Delete every variant file from storage and the index
  for (const fileKey of fileKeys) {
    await storage.removeItem(fileKey + ".cook");
    deleteFromRecipeIndex(fileKey + ".cook");
  }

  // Remove associated images — images use the base recipe name, so one pass
  const recipeFsPath = nodePath.join(
    process.cwd(),
    "public",
    "recipes",
    `${decodedPath}.cook`,
  );
  const recipeDirFsPath = nodePath.dirname(recipeFsPath);
  const recipeName = nodePath.basename(decodedPath);

  try {
    const discovered = await discoverRecipeImages(recipeDirFsPath, recipeName);
    await Promise.all(discovered.all.map((fsPath) => unlink(fsPath)));
  } catch {
    // Directory may not exist or images may already be gone — not critical
  }

  // Remove visibility overrides and share links (once, using base key)
  await deleteRecipeVisibilityAndLinks(recipeKey);

  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});


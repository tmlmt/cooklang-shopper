import { unlink } from "node:fs/promises";
import * as nodePath from "node:path";
import {
  deleteFromRecipeIndex,
  getRecipeIndex,
} from "~~/server/utils/recipeIndex";
import { discoverRecipeImages } from "~~/server/utils/recipeImages";
import { deleteRecipeVisibilityAndLinks } from "~~/server/utils/recipeVisibility";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const decodedPath = getValidatedRecipePath(event);

  const storage = useStorage("recipes");

  // Remove the recipe file itself
  const recipeKey = decodedPath.replace(/\//g, ":");
  await storage.removeItem(recipeKey + ".cook");

  // Remove associated images
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

  // Remove the recipe from the index
  deleteFromRecipeIndex(recipeKey);

  // Clean up visibility overrides and share links
  await deleteRecipeVisibilityAndLinks(recipeKey);

  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});

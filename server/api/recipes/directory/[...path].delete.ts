import { rm } from "node:fs/promises";
import * as nodePath from "node:path";
import { glob } from "glob";
import {
  deleteFromRecipeIndex,
  getRecipeIndex,
} from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const decodedPath = getValidatedRecipePath(event);

  const recipesRoot = nodePath.resolve(process.cwd(), "public", "recipes");
  const targetDir = nodePath.resolve(recipesRoot, decodedPath);

  // Security: ensure target stays within recipes root
  if (
    !targetDir.startsWith(recipesRoot + nodePath.sep) &&
    targetDir !== recipesRoot
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid directory path",
    });
  }

  // Find all .cook files within the directory to clean up the index
  const cookFiles = await glob("**/*.cook", { cwd: targetDir });
  const deletedRecipes: string[] = [];

  for (const file of cookFiles) {
    const relativePath = nodePath.join(decodedPath, file);
    const recipeKey = relativePath.replace(/\//g, ":").replace(/\.cook$/, "");
    deleteFromRecipeIndex(recipeKey);
    deletedRecipes.push(recipeKey);
  }

  // Remove the entire directory recursively (recipes, images, subdirectories)
  await rm(targetDir, { recursive: true });

  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes, deletedRecipes };
});

import { glob } from "glob";
import path from "node:path";
import { getRecipeIndex } from "~~/server/utils/recipeIndex";
import { getPublicRecipePaths } from "~~/server/utils/recipeVisibility";

export default defineEventHandler(async (event) => {
  const authenticated = await isAuthenticated(event);

  const dir = path.join(process.cwd(), "public", "recipes");
  const entries = await glob("**/", { cwd: dir });
  const allDirs = entries
    .map((d) => d.replace(/\/+$/, ""))
    .filter((d) => d.length > 0 && d !== ".")
    .sort((a, b) => a.localeCompare(b));

  if (authenticated) {
    return allDirs;
  }

  // Unauthenticated: only return directories that contain public recipes
  const publicPaths = await getPublicRecipePaths();
  const recipeIndex = getRecipeIndex();
  const publicDirs = new Set<string>();
  for (const key of publicPaths) {
    const entry = recipeIndex.get(key);
    if (entry?.dir) {
      // Add the directory and all parent directories
      const parts = entry.dir.split("/");
      for (let i = 1; i <= parts.length; i++) {
        publicDirs.add(parts.slice(0, i).join("/"));
      }
    }
  }
  return allDirs.filter((d) => publicDirs.has(d));
});

import { initRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  await initRecipeIndex();
  const recipeIndex = getRecipeIndex();

  // Clean up orphaned DB records for recipes that no longer exist on disk
  const db = getDb();
  const validPaths = new Set(recipeIndex.keys());

  const allVisibility = await db.recipeVisibility.findMany({
    select: { recipePath: true },
  });
  const orphanedVisibility = allVisibility
    .filter((r) => !validPaths.has(r.recipePath))
    .map((r) => r.recipePath);

  if (orphanedVisibility.length > 0) {
    await db.recipeVisibility.deleteMany({
      where: { recipePath: { in: orphanedVisibility } },
    });
    await db.shareLink.deleteMany({
      where: { recipePath: { in: orphanedVisibility } },
    });
  }

  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});

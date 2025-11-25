export default defineEventHandler(async () => {
  const storage = useStorage("recipes");
  const index = await storage.getItem("index.json");

  if (!index) {
    // Create index on first load
    await rebuildRecipeIndex();
    return await storage.getItem("index.json");
  }

  return index;
});

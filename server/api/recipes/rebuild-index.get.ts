export default defineEventHandler(async () => {
  const storage = useStorage("recipes");
  await rebuildRecipeIndex();
  return await storage.getItem("index.json");
});

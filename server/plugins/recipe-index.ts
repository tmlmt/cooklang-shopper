import { initRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineNitroPlugin(async () => {
  try {
    await initRecipeIndex();
  } catch (err) {
    console.error("Failed to initialize recipe index:", err);
  }
});

import { initRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineNitroPlugin(async () => {
  await initRecipeIndex();
});

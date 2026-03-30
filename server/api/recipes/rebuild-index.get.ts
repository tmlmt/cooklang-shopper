import { initRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  await initRecipeIndex();
  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});

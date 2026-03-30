import { getRecipeIndex } from "~~/server/utils/recipeIndex";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});

export default defineEventHandler(async (event) => {
  const authenticated = await isAuthenticated(event);

  const recipeIndex = getRecipeIndex();

  if (authenticated) {
    const recipes = Object.fromEntries(recipeIndex.entries());
    return { recipes };
  }

  // Unauthenticated: return only public recipes
  const publicPaths = await getPublicRecipePaths();
  const recipes: Record<
    string,
    typeof recipeIndex extends Map<string, infer V> ? V : never
  > = {};
  for (const key of publicPaths) {
    const entry = recipeIndex.get(key);
    if (entry) recipes[key] = entry;
  }
  return { recipes };
});

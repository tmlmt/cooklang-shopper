import { Recipe, ShoppingList } from "@tmlmt/cooklang-parser";

export default async function () {
  const shoppingStore = useShoppingStore();

  await shoppingStore.init();

  // Build a ShoppingList object from server data (needed by useShoppingCart)
  async function getListObject() {
    const shoppingList = new ShoppingList();
    for (const recipe of shoppingStore.recipeSelection) {
      // If a locale variant was stored, fetch that specific file; otherwise the default
      const fetchPath = recipe.locale
        ? `${recipe.path}.${recipe.locale}`
        : recipe.path;
      const rawRecipe = await $fetchWithHeaders<string>(
        `/api/recipe/${fetchPath}`,
      );
      shoppingList.addRecipe(new Recipe(rawRecipe), {
        scaling: { servings: recipe.servings },
        choices: recipe.choices,
      });
    }
    return shoppingList;
  }

  return { getListObject };
}

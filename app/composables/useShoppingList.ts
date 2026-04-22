import { Recipe, ShoppingList } from "@tmlmt/cooklang-parser";

export default async function () {
  const shoppingStore = useShoppingStore();

  await shoppingStore.init();

  // Build a ShoppingList object from server data (needed by useShoppingCart)
  async function getListObject() {
    const shoppingList = new ShoppingList();
    for (const recipe of shoppingStore.recipeSelection) {
      const rawRecipe = await $fetchWithHeaders<string>(
        `/api/recipe/${recipe.path}`,
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

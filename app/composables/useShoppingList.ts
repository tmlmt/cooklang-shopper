import { Recipe, ShoppingList, type Ingredient } from "@tmlmt/cooklang-parser";

export default async function () {
  const ingredients = ref<Ingredient[]>([]);

  const shoppingStore = useShoppingStore();

  async function getListObject() {
    const shoppingList = new ShoppingList();
    await shoppingStore.fetchAllRecipes();

    for (const recipe of shoppingStore.recipeSelection) {
      let rawRecipe = shoppingStore.getRecipeInList(recipe.path);
      if (!rawRecipe) {
        rawRecipe = await shoppingStore.fetchRecipe(recipe.path);
      }
      shoppingList.addRecipe(new Recipe(rawRecipe), {
        scaling: { servings: recipe.servings },
        choices: recipe.choices,
      });
    }
    return shoppingList;
  }

  // Update ingredients whenever the recipe selection changes
  // -- uses a version counter to address race conditions when multiple updates happen in quick succession
  // -- so that only the latest update is applied to the ingredients list
  let version = 0;
  watch(
    () => shoppingStore.recipeSelection,
    async () => {
      const v = ++version;
      const shoppingList = await getListObject();
      if (v === version) {
        ingredients.value = shoppingList.ingredients;
      }
    },
    { deep: true, immediate: true },
  );

  return { ingredients, getListObject };
}

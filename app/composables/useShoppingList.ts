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
      shoppingList.add_recipe(new Recipe(rawRecipe), {
        servings: recipe.servings,
      });
    }
    return shoppingList;
  }

  watchEffect(async () => {
    const shoppingList = await getListObject();
    ingredients.value = shoppingList.ingredients;
  });

  return { ingredients, getListObject };
}

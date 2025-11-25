import type { RecipeRaw, RecipeInfo } from "~~/types";

export const useShoppingStore = defineStore("shopping", () => {
  const recipeSelection = ref<RecipeInfo[]>([]);
  const recipeList = ref<RecipeRaw[]>([]);

  //------------------------------
  // recipeSelection methods
  //------------------------------

  function addRecipe(title: string, path: string, servings: number): boolean {
    // Checking if a recipe is already in the list
    if (isRecipeInSelection(path)) {
      return false;
    }
    recipeSelection.value.push({ title, path, servings });
    return true;
  }

  function editServings(path: string, servings: number): boolean {
    // Checking if a recipe is already in the list
    if (!isRecipeInSelection(path)) {
      console.log("false", JSON.stringify(recipeSelection.value));
      return false;
    }
    const index = recipeSelection.value.findIndex(
      (recipe) => recipe.path === path,
    );
    recipeSelection.value[index]!.servings = servings;
    console.log(JSON.stringify(recipeSelection.value));
    return true;
  }

  function removeRecipe(path: string): boolean {
    const index = recipeSelection.value.findIndex(
      (recipe) => recipe.path === path,
    );
    if (index > -1) {
      recipeSelection.value.splice(index, 1);
      return true;
    }
    return false;
  }

  function isRecipeInSelection(path: string): boolean {
    return recipeSelection.value.some((recipe) => recipe.path === path);
  }

  function getRecipeInSelection(path: string): RecipeInfo | undefined {
    return recipeSelection.value.find((recipe) => recipe.path === path);
  }

  function getServings(path: string): number | undefined {
    const recipe = getRecipeInSelection(path);
    if (!recipe) return undefined;
    return recipe.servings;
  }

  //------------------------
  // recipeList methods
  //------------------------

  async function fetchAllRecipes() {
    for (const recipe of recipeList.value) {
      await fetchRecipe(recipe.path);
    }
  }

  async function fetchRecipe(path: string): Promise<string> {
    if (!isRecipeInList(path)) {
      const res = await $fetch(`/api/recipe/${path}`);
      recipeList.value.push({ path, rawRecipe: res });
      return res;
    }

    return getRecipeInList(path)!;
  }

  function isRecipeInList(path: string): boolean {
    return recipeList.value.some((recipe) => recipe.path === path);
  }

  function getRecipeInList(path: string): string | undefined {
    const recipe = recipeList.value.find((recipe) => recipe.path === path);
    return recipe?.rawRecipe;
  }

  return {
    recipeSelection,
    recipeList,
    addRecipe,
    editServings,
    removeRecipe,
    isRecipeInSelection,
    getRecipeInSelection,
    getServings,
    fetchAllRecipes,
    fetchRecipe,
    getRecipeInList,
  };
});

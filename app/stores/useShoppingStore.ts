import type { RecipeInfo, RecipeChoicesWire } from "~~/shared/types";
import type { RecipeChoices, AddedIngredient } from "@tmlmt/cooklang-parser";
import { toRecipeChoices } from "~~/shared/utils/recipeChoices";

interface ShoppingListResponse {
  recipes: Array<Omit<RecipeInfo, "choices"> & { choices?: RecipeChoicesWire }>;
  ingredients: AddedIngredient[];
  checkedItems: string[];
}

function serializeRecipeChoices(
  choices?: RecipeChoices,
): RecipeChoicesWire | undefined {
  if (!choices) return undefined;
  return {
    ingredientItems: [
      ...(choices.ingredientItems ?? new Map<string, number>()).entries(),
    ],
    ingredientGroups: [
      ...(choices.ingredientGroups ?? new Map<string, number>()).entries(),
    ],
    variant: choices.variant,
  };
}

export const useShoppingStore = defineStore("shopping", () => {
  const recipeSelection = ref<RecipeInfo[]>([]);
  const ingredients = ref<AddedIngredient[]>([]);
  const checkedItems = ref<Set<string>>(new Set());

  let _loaded = false;

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  function applyResponse(data: ShoppingListResponse): void {
    recipeSelection.value = data.recipes.map((recipe) => ({
      ...recipe,
      choices: recipe.choices ? toRecipeChoices(recipe.choices) : undefined,
    }));
    ingredients.value = data.ingredients;
    checkedItems.value = new Set(data.checkedItems);
    _loaded = true;
  }

  async function fetchList(): Promise<void> {
    const data =
      await $fetchWithHeaders<ShoppingListResponse>("/api/shopping-list");
    applyResponse(data);
  }

  async function init(): Promise<void> {
    if (_loaded) return;
    try {
      await fetchList();
    } catch {
      // Shopping may be disabled or user not authenticated
      _loaded = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Mutations (API-backed)
  // ---------------------------------------------------------------------------

  async function addRecipe(
    title: string,
    path: string,
    servings: number,
    choices?: RecipeChoices,
  ): Promise<boolean> {
    if (isRecipeInSelection(path)) return false;
    // Optimistic add for instant UI feedback
    recipeSelection.value.push({ title, path, servings, choices });
    try {
      const data = await $fetchWithHeaders<ShoppingListResponse>(
        "/api/shopping-list/recipes",
        {
          method: "POST",
          body: {
            path,
            servings,
            choices: serializeRecipeChoices(choices),
          },
        },
      );
      applyResponse(data);
    } catch (e) {
      // Rollback optimistic add
      const idx = recipeSelection.value.findIndex((r) => r.path === path);
      if (idx > -1) recipeSelection.value.splice(idx, 1);
      throw e;
    }
    return true;
  }

  async function editServings(
    path: string,
    servings: number,
    choices?: RecipeChoices,
  ): Promise<boolean> {
    if (!isRecipeInSelection(path)) return false;
    // Optimistic update
    const recipe = recipeSelection.value.find((r) => r.path === path);
    const oldServings = recipe!.servings;
    const oldChoices = recipe!.choices;
    recipe!.servings = servings;
    if (choices !== undefined) recipe!.choices = choices;
    try {
      const data = await $fetchWithHeaders<ShoppingListResponse>(
        "/api/shopping-list/recipes",
        {
          method: "PATCH",
          body: {
            path,
            servings,
            choices: serializeRecipeChoices(choices),
          },
        },
      );
      applyResponse(data);
    } catch (e) {
      // Rollback optimistic update
      recipe!.servings = oldServings;
      recipe!.choices = oldChoices;
      throw e;
    }
    return true;
  }

  async function removeRecipe(path: string): Promise<boolean> {
    const idx = recipeSelection.value.findIndex((r) => r.path === path);
    if (idx === -1) return false;
    // Optimistic removal for immediate UI feedback
    recipeSelection.value.splice(idx, 1);
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      "/api/shopping-list/recipes",
      { method: "DELETE", body: { path } },
    );
    applyResponse(data);
    return true;
  }

  async function clearList(): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      "/api/shopping-list",
      { method: "DELETE" },
    );
    applyResponse(data);
  }

  // ---------------------------------------------------------------------------
  // Checked items
  // ---------------------------------------------------------------------------

  async function checkIngredient(
    name: string,
    checked: boolean,
  ): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      "/api/shopping-list/checks",
      { method: "POST", body: { ingredientName: name, checked } },
    );
    applyResponse(data);
  }

  function isChecked(name: string): boolean {
    return checkedItems.value.has(name);
  }

  async function uncheckAll(): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      "/api/shopping-list/checks",
      { method: "DELETE" },
    );
    applyResponse(data);
  }

  // ---------------------------------------------------------------------------
  // Synchronous lookups
  // ---------------------------------------------------------------------------

  function isRecipeInSelection(path: string): boolean {
    return recipeSelection.value.some((recipe) => recipe.path === path);
  }

  function getServings(path: string): number | undefined {
    return recipeSelection.value.find((recipe) => recipe.path === path)
      ?.servings;
  }

  return {
    recipeSelection,
    ingredients,
    checkedItems,
    init,
    fetchList,
    addRecipe,
    editServings,
    removeRecipe,
    clearList,
    checkIngredient,
    isChecked,
    uncheckAll,
    isRecipeInSelection,
    getServings,
  };
});

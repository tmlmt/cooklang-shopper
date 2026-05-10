import type { RecipeInfo, RecipeChoicesWire } from "~~/shared/types";
import type { RecipeChoices, AddedIngredient } from "@tmlmt/cooklang-parser";

export interface ShoppingListResponse {
  recipes: Array<Omit<RecipeInfo, "choices"> & { choices?: RecipeChoicesWire }>;
  ingredients: AddedIngredient[];
  manualItems: AddedIngredient[];
  checkedItems: string[];
}

export function useShoppingListActions(options?: {
  token?: string;
  mode?: "own" | "shared";
}) {
  function getToken(): string | null {
    if (options?.token) return options.token;
    if (options?.mode === "shared") {
      return useSharedListStore().token;
    }
    return null;
  }

  function url(path: string): string {
    const t = getToken();
    return t
      ? `/api/shopping-list/${path}?token=${t}`
      : `/api/shopping-list/${path}`;
  }

  const recipeSelection = ref<RecipeInfo[]>([]);
  const ingredients = ref<AddedIngredient[]>([]);
  const manualItems = ref<AddedIngredient[]>([]);
  const checkedItems = ref<Set<string>>(new Set());

  function applyResponse(data: ShoppingListResponse): void {
    recipeSelection.value = data.recipes.map((r) => ({
      ...r,
      choices: r.choices ? toRecipeChoices(r.choices) : undefined,
    }));
    ingredients.value = data.ingredients;
    manualItems.value = data.manualItems;
    checkedItems.value = new Set(data.checkedItems);
  }

  function isChecked(name: string): boolean {
    return checkedItems.value.has(name.toLowerCase());
  }

  async function checkIngredient(
    name: string,
    checked: boolean,
  ): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(url("checks"), {
      method: "POST",
      body: { ingredientName: name, checked },
    });
    applyResponse(data);
  }

  async function uncheckAll(): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(url("checks"), {
      method: "DELETE",
    });
    applyResponse(data);
  }

  async function editServings(
    path: string,
    servings: number,
    choices?: RecipeChoices,
  ): Promise<void> {
    const recipe = recipeSelection.value.find((r) => r.path === path);
    if (!recipe) return;
    const oldServings = recipe.servings;
    const oldChoices = recipe.choices;
    recipe.servings = servings;
    if (choices !== undefined) recipe.choices = choices;
    try {
      const data = await $fetchWithHeaders<ShoppingListResponse>(
        url("recipes"),
        {
          method: "PATCH",
          body: { path, servings, choices: serializeRecipeChoices(choices) },
        },
      );
      applyResponse(data);
    } catch (e) {
      recipe.servings = oldServings;
      recipe.choices = oldChoices;
      throw e;
    }
  }

  async function removeRecipe(path: string): Promise<void> {
    const idx = recipeSelection.value.findIndex((r) => r.path === path);
    if (idx === -1) return;
    recipeSelection.value.splice(idx, 1);
    const data = await $fetchWithHeaders<ShoppingListResponse>(url("recipes"), {
      method: "DELETE",
      body: { path },
    });
    applyResponse(data);
  }

  async function addManualItem(
    name: string,
    quantity?: string,
    unit?: string,
  ): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      url("manual-items"),
      { method: "POST", body: { name, quantity, unit } },
    );
    applyResponse(data);
  }

  async function removeManualItem(index: number): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      url("manual-items"),
      { method: "DELETE", body: { index } },
    );
    applyResponse(data);
  }

  async function addRecipe(
    title: string,
    path: string,
    servings: number,
    choices?: RecipeChoices,
  ): Promise<boolean> {
    if (recipeSelection.value.some((r) => r.path === path)) return false;
    recipeSelection.value.push({ title, path, servings, choices });
    try {
      const data = await $fetchWithHeaders<ShoppingListResponse>(
        url("recipes"),
        {
          method: "POST",
          body: { path, servings, choices: serializeRecipeChoices(choices) },
        },
      );
      applyResponse(data);
    } catch (e) {
      const idx = recipeSelection.value.findIndex((r) => r.path === path);
      if (idx > -1) recipeSelection.value.splice(idx, 1);
      throw e;
    }
    return true;
  }

  const sseUpdateCount = ref(0);
  let eventSource: EventSource | null = null;

  function connectToUpdates(): void {
    if (!import.meta.client) return;
    const t = getToken();
    const eventUrl = t
      ? `/api/shopping-list/events?token=${t}`
      : `/api/shopping-list/events`;
    eventSource = new EventSource(eventUrl);
    eventSource.onmessage = (e: MessageEvent) => {
      applyResponse(JSON.parse(e.data) as ShoppingListResponse);
      sseUpdateCount.value++;
    };
  }

  function disconnectFromUpdates(): void {
    eventSource?.close();
    eventSource = null;
  }

  return {
    recipeSelection,
    ingredients,
    manualItems,
    checkedItems,
    applyResponse,
    isChecked,
    checkIngredient,
    uncheckAll,
    editServings,
    removeRecipe,
    addRecipe,
    addManualItem,
    removeManualItem,
    connectToUpdates,
    disconnectFromUpdates,
    sseUpdateCount,
  };
}

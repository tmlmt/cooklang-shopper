import type { RecipeChoices } from "@tmlmt/cooklang-parser";

export const useShoppingStore = defineStore("shopping", () => {
  const actions = useShoppingListActions({ mode: "shared" });
  const sharedListStore = useSharedListStore();
  let _loaded = false;

  async function fetchList(): Promise<void> {
    if (sharedListStore.token) {
      const data = await $fetchWithHeaders<
        ShoppingListResponse & { ownerName: string; expiresAt: string | null }
      >(`/api/sharing/list/resolve/${sharedListStore.token}`);
      actions.applyResponse(data);
    } else {
      const data =
        await $fetchWithHeaders<ShoppingListResponse>("/api/shopping-list");
      actions.applyResponse(data);
    }
  }

  async function init(): Promise<void> {
    if (_loaded) return;
    try {
      await fetchList();
    } catch {
      // Shopping may be disabled or user not authenticated
    }
    _loaded = true;
  }

  async function addRecipe(
    title: string,
    path: string,
    servings: number,
    choices?: RecipeChoices,
  ): Promise<boolean> {
    return actions.addRecipe(title, path, servings, choices);
  }

  async function clearList(): Promise<void> {
    const data = await $fetchWithHeaders<ShoppingListResponse>(
      "/api/shopping-list",
      { method: "DELETE" },
    );
    actions.applyResponse(data);
  }

  async function switchToOwnList(): Promise<void> {
    sharedListStore.clearSharedList();
    await fetchList();
  }

  function isRecipeInSelection(path: string): boolean {
    return actions.recipeSelection.value.some((r) => r.path === path);
  }

  function getServings(path: string): number | undefined {
    return actions.recipeSelection.value.find((r) => r.path === path)?.servings;
  }

  return {
    recipeSelection: actions.recipeSelection,
    ingredients: actions.ingredients,
    manualItems: actions.manualItems,
    checkedItems: actions.checkedItems,
    categories: actions.categories,
    sharedToken: sharedListStore.token,
    sharedOwnerName: sharedListStore.ownerName,
    sharedExpiresAt: sharedListStore.expiresAt,
    init,
    fetchList,
    addRecipe,
    editServings: actions.editServings,
    removeRecipe: actions.removeRecipe,
    clearList,
    switchToOwnList,
    checkIngredient: actions.checkIngredient,
    isChecked: actions.isChecked,
    uncheckAll: actions.uncheckAll,
    removeManualItem: actions.removeManualItem,
    addManualItem: actions.addManualItem,
    isRecipeInSelection,
    getServings,
    connectToUpdates: actions.connectToUpdates,
    disconnectFromUpdates: actions.disconnectFromUpdates,
    sseUpdateCount: actions.sseUpdateCount,
  };
});

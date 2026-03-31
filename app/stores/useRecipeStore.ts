import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeIndex } from "~~/shared/types";

export const useRecipeStore = defineStore("recipe", () => {
  const recipes = ref<RecipeIndex>({});

  const recipeList = computed(() => Object.values(recipes.value));

  async function fetchIndex() {
    const data = await $fetchWithHeaders<{ recipes: RecipeIndex }>(
      "/api/recipes",
    );
    if (data?.recipes) {
      recipes.value = data.recipes;
    }
  }

  async function rebuildIndex() {
    const data = await $fetchWithHeaders<{ recipes: RecipeIndex }>(
      "/api/recipes/rebuild-index",
    );
    if (data?.recipes) {
      recipes.value = data.recipes;
    }
  }

  function addRecipe(name: string, dir: string, content: string) {
    const key = (dir ? `${dir}/${name}` : name).replace(/\//g, ":");
    const parsed = new Recipe(content);
    recipes.value[key] = {
      name,
      title: parsed.metadata.title || name,
      dir,
      servings: parsed.servings ?? 1,
      tags: parsed.metadata.tags || [],
    };
  }

  function updateRecipe(name: string, dir: string, content: string) {
    const key = (dir ? `${dir}/${name}` : name).replace(/\//g, ":");
    const existing = recipes.value[key];
    if (!existing) return;
    const parsed = new Recipe(content);
    recipes.value[key] = {
      ...existing,
      title: parsed.metadata.title || existing.name,
      servings: parsed.servings ?? 1,
      tags: parsed.metadata.tags || [],
    };
  }

  function moveRecipe(
    oldName: string,
    oldDir: string,
    newName: string,
    newDir: string,
  ) {
    const oldKey = (oldDir ? `${oldDir}/${oldName}` : oldName).replace(
      /\//g,
      ":",
    );
    const newKey = (newDir ? `${newDir}/${newName}` : newName).replace(
      /\//g,
      ":",
    );
    const existing = recipes.value[oldKey];
    if (!existing) return;
    const { [oldKey]: _, ...rest } = recipes.value;
    recipes.value = {
      ...rest,
      [newKey]: { ...existing, name: newName, dir: newDir },
    };
  }

  function removeRecipe(name: string, dir: string) {
    const key = (dir ? `${dir}/${name}` : name).replace(/\//g, ":");
    const { [key]: _, ...rest } = recipes.value;
    recipes.value = rest;
  }

  return {
    recipes,
    recipeList,
    fetchIndex,
    rebuildIndex,
    addRecipe,
    updateRecipe,
    moveRecipe,
    removeRecipe,
  };
});

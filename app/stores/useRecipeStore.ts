import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeIndex } from "~~/shared/types";

export const useRecipeStore = defineStore("recipe", () => {
  const recipes = ref<RecipeIndex>({});
  const directories = ref<string[]>([]);

  const recipeList = computed(() => Object.values(recipes.value));

  const normalizeDirectory = (dir: string) => dir.replace(/\/$/, "");

  const getTimeMetadata = (metadata: Record<string, unknown>) => {
    const times: Record<string, string> = {};
    for (const [metaKey, value] of Object.entries(metadata)) {
      if (!metaKey.toLowerCase().includes("time")) {
        continue;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        times[metaKey] = value;
      }
    }
    return Object.keys(times).length > 0 ? times : undefined;
  };

  function parseRecipeDetails(name: string, dir: string, content: string) {
    const parsed = new Recipe(content);
    const metadata = parsed.metadata as Record<string, unknown>;
    return {
      name,
      title: parsed.metadata.title || name,
      dir,
      servings: parsed.servings ?? 1,
      tags: parsed.metadata.tags || [],
      times: getTimeMetadata(metadata),
      author: typeof metadata.author === "string" ? metadata.author : undefined,
      source: typeof metadata.source === "string" ? metadata.source : undefined,
    };
  }

  async function fetchIndex() {
    const data = await $fetchWithHeaders<{ recipes: RecipeIndex }>(
      "/api/recipes",
    );
    if (data?.recipes) {
      recipes.value = data.recipes;
    }
  }

  async function fetchDirectories() {
    const data = await $fetchWithHeaders<string[]>("/api/recipes/directory");
    directories.value = (data || [])
      .map((dir) => normalizeDirectory(dir))
      .filter((dir) => dir.length > 0)
      .sort((a, b) => a.localeCompare(b));
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
    recipes.value[key] = parseRecipeDetails(name, dir, content);
    if (dir && !directories.value.includes(normalizeDirectory(dir))) {
      directories.value = [...directories.value, normalizeDirectory(dir)].sort(
        (a, b) => a.localeCompare(b),
      );
    }
  }

  function updateRecipe(name: string, dir: string, content: string) {
    const key = (dir ? `${dir}/${name}` : name).replace(/\//g, ":");
    const existing = recipes.value[key];
    if (!existing) return;
    const parsed = parseRecipeDetails(name, dir, content);
    recipes.value[key] = {
      ...existing,
      ...parsed,
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

  function removeFolderRecipes(folderPath: string): string[] {
    const removedPaths: string[] = [];
    const remaining: RecipeIndex = {};
    for (const [key, recipe] of Object.entries(recipes.value)) {
      if (
        recipe.dir === folderPath ||
        recipe.dir.startsWith(`${folderPath}/`)
      ) {
        removedPaths.push(
          recipe.dir ? `${recipe.dir}/${recipe.name}` : recipe.name,
        );
      } else {
        remaining[key] = recipe;
      }
    }
    recipes.value = remaining;
    return removedPaths;
  }

  function moveFolderRecipes(oldFolderPath: string, newFolderPath: string) {
    const updated: RecipeIndex = {};
    for (const [key, recipe] of Object.entries(recipes.value)) {
      if (
        recipe.dir === oldFolderPath ||
        recipe.dir.startsWith(`${oldFolderPath}/`)
      ) {
        const newDir =
          recipe.dir === oldFolderPath
            ? newFolderPath
            : newFolderPath + recipe.dir.slice(oldFolderPath.length);
        const newKey = (
          newDir ? `${newDir}/${recipe.name}` : recipe.name
        ).replace(/\//g, ":");
        updated[newKey] = { ...recipe, dir: newDir };
      } else {
        updated[key] = recipe;
      }
    }
    recipes.value = updated;
  }

  return {
    recipes,
    directories,
    recipeList,
    fetchIndex,
    fetchDirectories,
    rebuildIndex,
    addRecipe,
    updateRecipe,
    moveRecipe,
    removeRecipe,
    removeFolderRecipes,
    moveFolderRecipes,
  };
});

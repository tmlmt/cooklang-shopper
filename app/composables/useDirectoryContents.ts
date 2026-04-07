import type { RecipeEssentials } from "~~/shared/types";

export interface FolderInfo {
  name: string;
  path: string;
  subdirCount: number;
  recipeCount: number;
  servingsSummary: string;
  authorSummary: string;
  sourceSummary: string;
}

function summarizeServings(recipes: RecipeEssentials[]): string {
  if (recipes.length === 0) return "-";
  const servings = recipes
    .map((recipe) => recipe.servings)
    .filter((value) => Number.isFinite(value));
  if (servings.length === 0) return "-";

  const min = Math.min(...servings);
  const max = Math.max(...servings);
  return min === max ? `${min}` : `${min}-${max}`;
}

function summarizeDistinct(
  values: Array<string | undefined>,
  label: string,
): string {
  const unique = [
    ...new Set(values.filter((value): value is string => !!value)),
  ];
  if (unique.length === 0) return "-";
  if (unique.length === 1) return unique[0] || "-";
  return `${unique.length} ${label}`;
}

function normalizeDir(dir: string) {
  return dir.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function useDirectoryContents(currentPath: Ref<string>) {
  const recipeStore = useRecipeStore();

  const normalizedPath = computed(() => normalizeDir(currentPath.value));

  const folders = computed<FolderInfo[]>(() => {
    const current = normalizedPath.value;
    const prefix = current ? `${current}/` : "";

    const directChildren = recipeStore.directories
      .filter((dir) => {
        if (!dir.startsWith(prefix)) {
          return false;
        }
        const relative = dir.substring(prefix.length);
        return relative.length > 0 && !relative.includes("/");
      })
      .sort((a, b) => a.localeCompare(b));

    return directChildren.map((folderPath) => {
      const recipesInFolder = recipeStore.recipeList.filter(
        (recipe) =>
          recipe.dir === folderPath || recipe.dir.startsWith(`${folderPath}/`),
      );

      const subdirCount = recipeStore.directories.filter(
        (dir) => dir !== folderPath && dir.startsWith(`${folderPath}/`),
      ).length;

      return {
        name: folderPath.split("/").pop() || folderPath,
        path: folderPath,
        subdirCount,
        recipeCount: recipesInFolder.length,
        servingsSummary: summarizeServings(recipesInFolder),
        authorSummary: summarizeDistinct(
          recipesInFolder.map((recipe) => recipe.author),
          "authors",
        ),
        sourceSummary: summarizeDistinct(
          recipesInFolder.map((recipe) => recipe.source),
          "sources",
        ),
      };
    });
  });

  const recipes = computed<RecipeEssentials[]>(() => {
    const current = normalizedPath.value;
    return recipeStore.recipeList
      .filter((recipe) => normalizeDir(recipe.dir) === current)
      .sort((a, b) => a.title.localeCompare(b.title));
  });

  return {
    folders,
    recipes,
  };
}

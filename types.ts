export interface RecipeInfo {
  title: string;
  path: string;
  servings: number;
}

export interface RecipeRaw {
  path: string;
  rawRecipe: string;
}

export interface RecipeEssentials {
  name: string;
  title: string;
  dir: string;
  servings: number;
  tags: string[];
}

export interface RecipeIndex {
  [key: string]: RecipeEssentials;
}

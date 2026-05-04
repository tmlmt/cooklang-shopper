<script setup lang="ts">
import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeEssentials } from "~~/shared/types";

const props = defineProps<{
  currentPath: string;
}>();

const shoppingStore = useShoppingStore();
await shoppingStore.init();
const modalChoices = await useModalChoices();
const currentPathRef = toRef(props, "currentPath");
const { folders, recipes } = useDirectoryContents(currentPathRef);

const recipePath = (recipe: RecipeEssentials) =>
  recipe.dir ? `${recipe.dir}/${recipe.name}` : recipe.name;

const visibleRecipePaths = computed(() =>
  recipes.value.map((recipe) => recipePath(recipe)),
);

const { covers, status: coversStatus } =
  useRecipeCoverImages(visibleRecipePaths);

const isCoversLoading = computed(() => coversStatus.value === "pending");

const isSelected = (recipe: RecipeEssentials) =>
  shoppingStore.isRecipeInSelection(recipePath(recipe));

const toggleSelection = async (recipe: RecipeEssentials) => {
  const path = recipePath(recipe);
  if (shoppingStore.isRecipeInSelection(path)) {
    shoppingStore.removeRecipe(path);
    return;
  }

  const raw = await $fetchWithHeaders<string>(`/api/recipe/${path}`);
  const recipeObj = new Recipe(raw);
  const choicesForDefaultVariant = recipeObj.getChoicesForVariant();
  const hasChoices =
    choicesForDefaultVariant.ingredientItems.size > 0 ||
    choicesForDefaultVariant.ingredientGroups.size > 0;

  let choices;
  if (hasChoices) {
    choices = await modalChoices.open(recipeObj);
    if (!choices) return; // user cancelled
  }

  await shoppingStore.addRecipe(recipe.title, path, recipe.servings, choices);
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="folders.length > 0"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <RecipeFolderCard
        v-for="folder in folders"
        :key="folder.path"
        :folder="folder"
        compact
      />
    </div>

    <div
      v-if="recipes.length > 0"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <RecipeGridCard
        v-for="recipe in recipes"
        :key="`${recipe.dir}/${recipe.name}`"
        :recipe="recipe"
        :selected="isSelected(recipe)"
        :cover-image="covers[recipePath(recipe)]"
        :loading="isCoversLoading"
        @toggle="toggleSelection(recipe)"
      />
    </div>

    <LazyUAlert
      v-if="folders.length === 0 && recipes.length === 0"
      color="neutral"
      variant="subtle"
      title="Nothing here yet"
      description="Create a recipe or add a subfolder to get started."
    />
  </div>
</template>

<script setup lang="ts">
import type { Ingredient } from "@tmlmt/cooklang-parser";

defineProps<{
  ingredients: Ingredient[];
  allIngredients?: Ingredient[];
}>();
</script>

<template>
  <ul class="ml-6 list-disc">
    <IngredientItem
      v-for="ingredient in ingredients.toSorted((a, b) =>
        a.name.localeCompare(b.name),
      )"
      :key="ingredient.name"
      :ingredient="ingredient"
      :all-ingredients="allIngredients ?? ingredients"
    />
  </ul>
</template>

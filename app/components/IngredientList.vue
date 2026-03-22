<script setup lang="ts">
import {
  formatQuantityWithUnit,
  type Ingredient,
} from "@tmlmt/cooklang-parser";

interface Props {
  ingredients: Ingredient[];
}
const { ingredients } = defineProps<Props>();

function formatIngredientQuantities(ingredient: Ingredient): string {
  if (!ingredient.quantities?.length) return "";
  return ingredient.quantities
    .map((q) => {
      if ("and" in q) {
        return q.and
          .map((a) => formatQuantityWithUnit(a.quantity, a.unit))
          .join(" + ");
      }
      return formatQuantityWithUnit(q.quantity, q.unit);
    })
    .join(", ");
}
</script>

<template>
  <ul class="ml-6 list-disc">
    <li
      v-for="ingredient in ingredients.toSorted((a, b) =>
        a.name.localeCompare(b.name),
      )"
      :key="ingredient.name"
    >
      <span v-if="ingredient.quantities?.length">
        {{ formatIngredientQuantities(ingredient) }}
      </span>
      {{ ingredient.name }}
      <span v-if="ingredient.preparation">
        ({{ ingredient.preparation }})
      </span>
    </li>
  </ul>
</template>

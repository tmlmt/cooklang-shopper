<script setup lang="ts">
import type { Ingredient } from "@tmlmt/cooklang-parser";

interface Props {
  ingredients: Ingredient[];
}
const { ingredients } = defineProps<Props>();
</script>

<template>
  <ul class="ml-6 list-disc">
    <li
      v-for="ingredient in ingredients.toSorted((a, b) =>
        a.name.localeCompare(b.name),
      )"
      :key="ingredient.name"
    >
      {{ ingredient.name }}:
      <span v-if="ingredient.quantity">
        {{ getQuantityValue(ingredient.quantity) }}
        {{ ingredient.unit }}
      </span>
      <span v-if="ingredient.preparation">
        ({{ ingredient.preparation }})
      </span>
    </li>
  </ul>
</template>

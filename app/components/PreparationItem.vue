<script setup lang="ts">
import type { Recipe, Item } from "@tmlmt/cooklang-parser";

interface Props {
  recipe: Recipe;
  item: Item;
}

const { recipe, item } = defineProps<Props>();
</script>

<template>
  <span
    :class="{
      'font-bold': item.type !== 'text',
      'text-primary': item.type === 'ingredient',
      'text-secondary': item.type === 'cookware',
      'text-teal': item.type === 'timer',
    }"
    >{{ renderItem(item, recipe) }}</span
  >
</template>

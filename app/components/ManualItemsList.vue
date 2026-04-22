<script setup lang="ts">
import type { Ingredient } from "@tmlmt/cooklang-parser";

const props = withDefaults(
  defineProps<{
    items: Ingredient[];
    desktopColumns?: 1 | 2;
  }>(),
  {
    desktopColumns: 2,
  },
);

const shoppingStore = useShoppingStore();
</script>

<template>
  <ul
    class="grid list-disc gap-x-8 gap-y-1 pl-5"
    :class="{ 'md:grid-cols-2': props.desktopColumns === 2 }"
  >
    <li
      v-for="(item, index) in props.items"
      :key="item.name"
      class="group"
    >
      <span class="flex items-center justify-start">
        <IngredientItem :ingredient="item" :all-ingredients="props.items" />
        <UButton
          icon="prime:trash"
          color="neutral"
          variant="ghost"
          size="xs"
          class="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
          @click="shoppingStore.removeManualItem(index)"
        />
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Ingredient } from "@tmlmt/cooklang-parser";

const props = withDefaults(
  defineProps<{
    items: Ingredient[];
    desktopColumns?: 1 | 2;
    onDeleteFn?: (index: number) => void;
  }>(),
  {
    desktopColumns: 2,
    onDeleteFn: undefined,
  },
);

const selectedIndex = ref<number | null>(null);

function toggleSelected(index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index;
}
</script>

<template>
  <ul
    class="grid list-disc gap-x-8 gap-y-1 pl-5"
    :class="{ 'md:grid-cols-2': props.desktopColumns === 2 }"
  >
    <li
      v-for="(item, index) in props.items"
      :key="item.name"
      class="group/item"
      :class="{ 'cursor-pointer': props.onDeleteFn }"
      @click="props.onDeleteFn && toggleSelected(index)"
    >
      <span class="flex items-center justify-start">
        <IngredientItem :ingredient="item" :all-ingredients="props.items" />
        <UButton
          v-if="props.onDeleteFn"
          icon="prime:trash"
          color="neutral"
          variant="ghost"
          size="xs"
          class="ml-2 opacity-0 transition-opacity group-hover/item:opacity-100"
          :class="{ 'opacity-100!': selectedIndex === index }"
          @click.stop="props.onDeleteFn(index)"
        />
      </span>
    </li>
  </ul>
</template>

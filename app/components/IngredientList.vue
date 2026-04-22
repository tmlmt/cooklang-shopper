<script setup lang="ts">
import type { Ingredient } from "@tmlmt/cooklang-parser";

const props = withDefaults(
  defineProps<{
    ingredients: Ingredient[];
    allIngredients?: Ingredient[];
    interactive?: boolean;
    showHeader?: boolean;
    desktopColumns?: 1 | 2;
  }>(),
  {
    allIngredients: undefined,
    interactive: true,
    desktopColumns: 2,
  },
);

const shoppingStore = useShoppingStore();
const hideChecked = ref(false);

const headerVisible = computed(() => props.showHeader ?? props.interactive);

const sorted = computed(() =>
  [...props.ingredients].sort((a, b) => a.name.localeCompare(b.name)),
);

const visible = computed(() =>
  props.interactive && hideChecked.value
    ? sorted.value.filter((i) => !shoppingStore.isChecked(i.name))
    : sorted.value,
);

const checkedCount = computed(
  () => sorted.value.filter((i) => shoppingStore.isChecked(i.name)).length,
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="headerVisible" class="flex items-center justify-between gap-4">
      <span class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ checkedCount }} / {{ sorted.length }} checked
      </span>
      <UCheckbox v-model="hideChecked" label="Hide checked" />
    </div>
    <div
      class="grid gap-x-8 gap-y-1"
      :class="{ 'md:grid-cols-2': props.desktopColumns === 2 }"
    >
      <div
        v-for="ingredient in visible"
        :key="ingredient.name"
        class="flex items-start gap-2"
        :class="{
          'opacity-40':
            props.interactive && shoppingStore.isChecked(ingredient.name),
        }"
      >
        <UCheckbox
          v-if="props.interactive"
          class="mt-0.5 shrink-0"
          :model-value="shoppingStore.isChecked(ingredient.name)"
          @update:model-value="
            (v) =>
              shoppingStore.checkIngredient(
                ingredient.name,
                v === 'indeterminate' ? false : v,
              )
          "
        />
        <IngredientItem
          :ingredient="ingredient"
          :all-ingredients="allIngredients ?? ingredients"
          :class="{
            'line-through':
              props.interactive && shoppingStore.isChecked(ingredient.name),
          }"
        />
      </div>
    </div>
  </div>
</template>

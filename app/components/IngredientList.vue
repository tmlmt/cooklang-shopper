<script setup lang="ts">
import type { Ingredient } from "@tmlmt/cooklang-parser";

const props = withDefaults(
  defineProps<{
    ingredients: Ingredient[];
    allIngredients?: Ingredient[];
    interactive?: boolean;
    showHeader?: boolean;
    desktopColumns?: 1 | 2;
    isCheckedFn?: (name: string) => boolean;
    onCheckFn?: (name: string, checked: boolean) => void;
  }>(),
  {
    allIngredients: undefined,
    interactive: true,
    desktopColumns: 2,
    isCheckedFn: undefined,
    onCheckFn: undefined,
  },
);

const shoppingStore = useShoppingStore();
const hideChecked = ref(false);

const isChecked = computed(() => {
  return props.isCheckedFn
    ? props.isCheckedFn
    : (name: string) => shoppingStore.isChecked(name);
});
const onCheck = computed(() => {
  return props.onCheckFn
    ? props.onCheckFn
    : (name: string, checked: boolean) =>
        shoppingStore.checkIngredient(name, checked);
});

const headerVisible = computed(() => props.showHeader ?? props.interactive);

const sorted = computed(() =>
  [...props.ingredients].sort((a, b) => a.name.localeCompare(b.name)),
);

const visible = computed(() =>
  props.interactive && hideChecked.value
    ? sorted.value.filter((i) => !isChecked.value(i.name))
    : sorted.value,
);

const checkedCount = computed(
  () => sorted.value.filter((i) => isChecked.value(i.name)).length,
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
          'opacity-40': props.interactive && isChecked(ingredient.name),
        }"
      >
        <UCheckbox
          v-if="props.interactive"
          class="mt-0.5 shrink-0"
          :model-value="isChecked(ingredient.name)"
          @update:model-value="
            (v) => onCheck(ingredient.name, v === 'indeterminate' ? false : v)
          "
        />
        <IngredientItem
          :ingredient="ingredient"
          :all-ingredients="allIngredients ?? ingredients"
          :class="{
            'line-through': props.interactive && isChecked(ingredient.name),
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AddedIngredient, Ingredient } from "@tmlmt/cooklang-parser";

const props = withDefaults(
  defineProps<{
    ingredients: Ingredient[];
    allIngredients?: Ingredient[];
    interactive?: boolean;
    showHeader?: boolean;
    desktopColumns?: 1 | 2;
    isCheckedFn?: (name: string) => boolean;
    onCheckFn?: (name: string, checked: boolean) => void;
    categories?: Record<string, AddedIngredient[]>;
  }>(),
  {
    allIngredients: undefined,
    interactive: true,
    desktopColumns: 2,
    isCheckedFn: undefined,
    onCheckFn: undefined,
    categories: undefined,
  },
);

const shoppingStore = useShoppingStore();
const hideChecked = ref(false);
const { $ts } = useI18n();

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

// Grouped mode: sort category entries, move "other" to the end
const categoryEntries = computed<[string, AddedIngredient[]][]>(() => {
  if (!props.categories || Object.keys(props.categories).length === 0)
    return [];
  const entries = Object.entries(props.categories);
  const otherIdx = entries.findIndex(([key]) => key === "other");
  if (otherIdx !== -1) {
    const [other] = entries.splice(otherIdx, 1);
    entries.push(other!);
  }
  return entries;
});

const isGrouped = computed(() => categoryEntries.value.length > 0);

function visibleInCategory(items: AddedIngredient[]): AddedIngredient[] {
  return props.interactive && hideChecked.value
    ? items.filter((i) => !isChecked.value(i.name))
    : items;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="headerVisible" class="flex items-center justify-between gap-4">
      <span class="text-sm text-neutral-500 dark:text-neutral-400">
        {{
          $ts("ingredientList.checkedCount", {
            checked: checkedCount,
            total: sorted.length,
          })
        }}
      </span>
      <UCheckbox
        v-model="hideChecked"
        :label="$ts('ingredientList.hideChecked')"
      />
    </div>

    <!-- Grouped by category -->
    <template v-if="isGrouped">
      <div
        v-for="[categoryKey, items] in categoryEntries"
        :key="categoryKey"
        class="flex flex-col gap-1"
      >
        <h3
          v-if="!(categoryKey === 'other' && categoryEntries.length === 1)"
          class="text-sm font-semibold text-neutral-500 capitalize dark:text-neutral-400"
        >
          {{
            categoryKey === "other" ? $ts("ingredientList.other") : categoryKey
          }}
        </h3>
        <div
          class="grid gap-x-8 gap-y-1"
          :class="{ 'md:grid-cols-2': props.desktopColumns === 2 }"
        >
          <div
            v-for="ingredient in visibleInCategory(items)"
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
                (v) =>
                  onCheck(ingredient.name, v === 'indeterminate' ? false : v)
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

    <!-- Flat (no category config) -->
    <div
      v-else
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

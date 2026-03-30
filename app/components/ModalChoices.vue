<script setup lang="ts">
import type {
  Recipe,
  RecipeChoices,
  IngredientAlternative,
} from "@tmlmt/cooklang-parser";
import {
  formatItemQuantity,
  getEffectiveChoices,
} from "@tmlmt/cooklang-parser";

const props = defineProps<{
  recipe: Recipe;
  initialVariant?: string;
}>();

const emit = defineEmits<{ close: [RecipeChoices | undefined] }>();

defineShortcuts({
  escape: () => emit("close", undefined),
});

const choices = ref<RecipeChoices>(
  getEffectiveChoices(props.recipe, props.initialVariant),
);

const hasInlineChoices = computed(
  () => props.recipe.choices.ingredientItems.size > 0,
);
const hasGroupedChoices = computed(
  () => props.recipe.choices.ingredientGroups.size > 0,
);
const hasAnyChoices = computed(
  () => hasInlineChoices.value || hasGroupedChoices.value,
);

const inlineChoicesArray = computed(() => {
  return Array.from(props.recipe.choices.ingredientItems.entries());
});
const groupedChoicesArray = computed(() => {
  return Array.from(props.recipe.choices.ingredientGroups.entries());
});

interface ChoiceOption {
  label: string;
  value: number | undefined;
}

function buildInlineLabel(alternatives: IngredientAlternative[]): string {
  if (alternatives.length === 0) return "Unknown";
  const first = alternatives[0]!;
  const name = first.displayName;
  if (first.quantity) {
    const qty = formatItemQuantity(first);
    return qty ? `${name} (${qty})` : name;
  }
  return name;
}

function buildAlternativeOptions(
  alternatives: IngredientAlternative[],
): ChoiceOption[] {
  const options: ChoiceOption[] = [{ label: "No choice", value: undefined }];
  for (let i = 0; i < alternatives.length; i++) {
    const alt = alternatives[i]!;
    let label = alt.displayName;
    if (alt.note) {
      label += ` ${alt.note}`;
    }
    if (alt.quantity) {
      const qty = formatItemQuantity(alt);
      if (qty) {
        label += ` (${qty})`;
      }
    }
    options.push({ label, value: i });
  }
  return options;
}

function buildGroupedAlternativeOptions(
  subgroups: IngredientAlternative[][],
): ChoiceOption[] {
  const options: ChoiceOption[] = [{ label: "No choice", value: undefined }];
  for (let i = 0; i < subgroups.length; i++) {
    const subgroup = subgroups[i]!;
    const label = subgroup
      .map((alt) => {
        let part = alt.displayName;
        if (alt.quantity) {
          const qty = formatItemQuantity(alt);
          if (qty) {
            part += ` (${qty})`;
          }
        }
        return part;
      })
      .join(" + ");
    options.push({ label, value: i });
  }
  return options;
}

function getSelectedInline(itemId: string): number | undefined {
  return choices.value.ingredientItems?.get(itemId);
}

function setSelectedInline(itemId: string, value: number | undefined) {
  const newMap = new Map(choices.value.ingredientItems);
  if (value === undefined) {
    newMap.delete(itemId);
  } else {
    newMap.set(itemId, value);
  }
  choices.value = {
    ...choices.value,
    ingredientItems: newMap,
  };
}

function getSelectedGrouped(groupKey: string): number | undefined {
  return choices.value.ingredientGroups?.get(groupKey);
}

function setSelectedGrouped(groupKey: string, value: number | undefined) {
  const newMap = new Map(choices.value.ingredientGroups);
  if (value === undefined) {
    newMap.delete(groupKey);
  } else {
    newMap.set(groupKey, value);
  }
  choices.value = {
    ...choices.value,
    ingredientGroups: newMap,
  };
}
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', undefined) }"
    title="Choose ingredient alternatives"
  >
    <div class="flex flex-col gap-4 p-4">
      <p v-if="!hasAnyChoices" class="text-sm text-neutral-500 italic">
        No ingredient alternatives available for this recipe.
      </p>

      <!-- Inline alternatives -->
      <div v-if="hasInlineChoices" class="flex flex-col gap-3">
        <h4 class="text-sm font-semibold">Inline Alternatives</h4>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="[itemId, alternatives] in inlineChoicesArray"
            :key="itemId"
            class="flex flex-col gap-1"
          >
            <label
              class="text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              {{ buildInlineLabel(alternatives) }}
            </label>
            <USelectMenu
              :model-value="getSelectedInline(itemId)"
              :items="buildAlternativeOptions(alternatives)"
              value-key="value"
              class="w-full"
              @update:model-value="setSelectedInline(itemId, $event)"
            />
          </div>
        </div>
      </div>

      <!-- Grouped alternatives -->
      <div v-if="hasGroupedChoices" class="flex flex-col gap-3">
        <h4 class="text-sm font-semibold">Grouped Alternatives</h4>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="[groupKey, subgroups] in groupedChoicesArray"
            :key="groupKey"
            class="flex flex-col gap-1"
          >
            <label
              class="text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              {{ groupKey }}
            </label>
            <USelectMenu
              :model-value="getSelectedGrouped(groupKey)"
              :items="buildGroupedAlternativeOptions(subgroups)"
              value-key="value"
              class="w-full"
              @update:model-value="setSelectedGrouped(groupKey, $event)"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          label="Cancel"
          @click="emit('close', undefined)"
        />
        <UButton
          color="primary"
          label="Confirm"
          @click="emit('close', choices)"
        />
      </div>
    </template>
  </UModal>
</template>

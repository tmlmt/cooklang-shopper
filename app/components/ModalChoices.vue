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
import type { FormError } from "@nuxt/ui";

const props = defineProps<{
  recipe: Recipe;
  initialVariant?: string;
  initialChoices?: RecipeChoices;
}>();

const emit = defineEmits<{ close: [RecipeChoices | undefined] }>();

const { $ts } = useI18n();

defineShortcuts({
  escape: () => emit("close", undefined),
});

const activeVariant = computed(
  () => props.initialChoices?.variant ?? props.initialVariant,
);
const variantChoices = computed(() =>
  props.recipe.getChoicesForVariant(activeVariant.value),
);

const hasInlineChoices = computed(
  () => variantChoices.value.ingredientItems.size > 0,
);
const hasGroupedChoices = computed(
  () => variantChoices.value.ingredientGroups.size > 0,
);
const hasAnyChoices = computed(
  () => hasInlineChoices.value || hasGroupedChoices.value,
);

const inlineChoicesArray = computed(() => {
  return Array.from(variantChoices.value.ingredientItems.entries());
});
const groupedChoicesArray = computed(() => {
  return Array.from(variantChoices.value.ingredientGroups.entries());
});

interface ChoiceOption {
  label: string;
  value: number | undefined;
}

// Flat reactive state: inline_<itemId> and group_<groupKey> → selected index
const effectiveChoices = getEffectiveChoices(props.recipe, activeVariant.value);
const state = reactive<Record<string, number | undefined>>(
  Object.fromEntries([
    ...[...variantChoices.value.ingredientItems.keys()].map((k) => [
      `inline_${k}`,
      props.initialChoices?.ingredientItems?.get(k) ??
        effectiveChoices.ingredientItems?.get(k),
    ]),
    ...[...variantChoices.value.ingredientGroups.keys()].map((k) => [
      `group_${k}`,
      props.initialChoices?.ingredientGroups?.get(k) ??
        effectiveChoices.ingredientGroups?.get(k),
    ]),
  ]),
);

function validate(state: Record<string, number | undefined>): FormError[] {
  return Object.keys(state)
    .filter((key) => state[key] === undefined)
    .map((key) => ({ name: key, message: $ts('choices.pleaseSelect') }));
}

const form = useTemplateRef("choicesForm");

function onSubmit() {
  const ingredientItems = new Map<string, number>();
  const ingredientGroups = new Map<string, number>();
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined) continue;
    if (key.startsWith("inline_")) {
      ingredientItems.set(key.slice("inline_".length), value);
    } else if (key.startsWith("group_")) {
      ingredientGroups.set(key.slice("group_".length), value);
    }
  }
  emit("close", {
    ingredientItems,
    ingredientGroups,
    variant: activeVariant.value,
  });
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
  const options: ChoiceOption[] = [{ label: $ts('choices.noChoice'), value: undefined }];
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
  const options: ChoiceOption[] = [{ label: $ts('choices.noChoice'), value: undefined }];
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
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', undefined) }"
    :title="$ts('choices.title')"
  >
    <template #body>
      <UForm
        ref="choicesForm"
        :state="state"
        :validate="validate"
        class="flex flex-col gap-4 p-4"
        @submit="onSubmit"
      >
        <p v-if="!hasAnyChoices" class="text-sm text-neutral-500 italic">
          {{ $ts('choices.noAlternatives') }}
        </p>

        <!-- Inline alternatives -->
        <div v-if="hasInlineChoices" class="flex flex-col gap-3">
          <h4 class="text-sm font-semibold">{{ $ts('choices.inlineAlternatives') }}</h4>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <UFormField
              v-for="[itemId, alternatives] in inlineChoicesArray"
              :key="itemId"
              :name="`inline_${itemId}`"
              :label="buildInlineLabel(alternatives)"
            >
              <USelectMenu
                v-model="state[`inline_${itemId}`]"
                :items="buildAlternativeOptions(alternatives)"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Grouped alternatives -->
        <div v-if="hasGroupedChoices" class="flex flex-col gap-3">
          <h4 class="text-sm font-semibold">{{ $ts('choices.groupedAlternatives') }}</h4>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <UFormField
              v-for="[groupKey, subgroups] in groupedChoicesArray"
              :key="groupKey"
              :name="`group_${groupKey}`"
              :label="groupKey"
            >
              <USelectMenu
                v-model="state[`group_${groupKey}`]"
                :items="buildGroupedAlternativeOptions(subgroups)"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="$ts('actions.cancel')"
          @click="emit('close', undefined)"
        />
        <UButton color="primary" :label="$ts('actions.confirm')" @click="form?.submit()" />
      </div>
    </template>
  </UModal>
</template>

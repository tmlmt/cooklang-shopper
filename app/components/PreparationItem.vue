<script setup lang="ts">
import type {
  Recipe,
  Step,
  IngredientAlternative,
  RecipeChoices,
  IngredientItem,
  QuantityWithPlainUnit,
  QuantityWithExtendedUnit,
} from "@tmlmt/cooklang-parser";
import { isAlternativeSelected, isGroupedItem } from "@tmlmt/cooklang-parser";

const { $ts } = useI18n();
const recipeT = inject<typeof $ts>("recipeT", $ts);

const props = defineProps<{
  step: Step;
  recipe: Recipe;
  choices?: RecipeChoices;
}>();

function hasInlineChoice(item: IngredientItem): boolean {
  return props.choices?.ingredientItems?.has(item.id) ?? false;
}

function hasGroupChoice(item: IngredientItem): boolean {
  if (!item.group) return false;
  return props.choices?.ingredientGroups?.has(item.group) ?? false;
}

function isGroupedItemSelected(item: IngredientItem): boolean {
  if (!hasGroupChoice(item)) return true;
  return isAlternativeSelected(props.recipe, props.choices ?? {}, item);
}

function toPlainEquivalents(
  equivalents: QuantityWithExtendedUnit[] | undefined,
): QuantityWithPlainUnit[] | undefined {
  return equivalents?.map((eq) => ({
    quantity: eq.quantity,
    unit: eq.unit?.name,
  }));
}

function getVisibleAlternatives(
  item: IngredientItem,
): { alt: IngredientAlternative; originalIndex: number }[] {
  if (!hasInlineChoice(item)) {
    return item.alternatives.map((alt, idx) => ({ alt, originalIndex: idx }));
  }
  return item.alternatives
    .map((alt, idx) => ({ alt, originalIndex: idx }))
    .filter(({ originalIndex }) =>
      isAlternativeSelected(
        props.recipe,
        props.choices ?? {},
        item,
        originalIndex,
      ),
    );
}
</script>

<template>
  <span>
    <template v-for="(item, idx) in step.items" :key="idx">
      <template v-if="item.type === 'text'">
        <strong v-if="item.attribute === 'bold'">{{ item.value }}</strong>
        <em v-else-if="item.attribute === 'italic'">{{ item.value }}</em>
        <strong v-else-if="item.attribute === 'bold+italic'"
          ><em>{{ item.value }}</em></strong
        >
        <a
          v-else-if="item.attribute === 'link'"
          class="underline"
          :href="item.href"
          target="_blank"
          rel="noopener noreferrer"
          >{{ item.value }}</a
        >
        <code v-else-if="item.attribute === 'code'">{{ item.value }}</code>
        <template v-else>{{ item.value }}</template>
      </template>
      <template v-else-if="item.type === 'ingredient'">
        <!-- Grouped alternative -->
        <template v-if="isGroupedItem(item)">
          <span
            :class="[
              'font-medium text-secondary',
              {
                'line-through opacity-50': !isGroupedItemSelected(item),
              },
            ]"
          >
            <template v-if="item.alternatives[0]?.quantity">
              <RecipeQuantityWithEquivalents
                :quantity="item.alternatives[0]!.quantity!"
                :unit="item.alternatives[0]!.unit?.name"
                :equivalents="
                  toPlainEquivalents(item.alternatives[0]!.equivalents)
                "
              />
              {{ " " }}
            </template>
            {{ item.alternatives[0]?.displayName }}
          </span>
        </template>
        <!-- Inline alternatives -->
        <template v-else>
          <template
            v-for="(visibleAlt, visIdx) in getVisibleAlternatives(item)"
            :key="visibleAlt.originalIndex"
          >
            <span
              v-if="visIdx > 0"
              class="text-neutral-500 dark:text-neutral-300"
            >
              {{ " " }}{{ recipeT("delimiters.openingBracket")
              }}{{ recipeT("delimiters.or") }}
            </span>
            <span
              :class="[
                'font-medium text-secondary',
                { 'text-neutral-500 dark:text-neutral-300': visIdx > 0 },
              ]"
            >
              <template v-if="visibleAlt.alt.quantity">
                <RecipeQuantityWithEquivalents
                  :quantity="visibleAlt.alt.quantity"
                  :unit="visibleAlt.alt.unit?.name"
                  :equivalents="toPlainEquivalents(visibleAlt.alt.equivalents)"
                  :wrapper-start="visIdx > 0 ? '[' : undefined"
                  :wrapper-end="visIdx > 0 ? ']' : undefined"
                />
                {{ " " }}
              </template>
              <span
                :class="{
                  'font-medium text-secondary': visIdx === 0,
                }"
                >{{ visibleAlt.alt.displayName }}</span
              >
              <template v-if="visibleAlt.alt.note && !hasInlineChoice(item)">
                <span
                  class="font-normal text-neutral-500 italic dark:text-neutral-300"
                >
                  {{ " " }}- {{ visibleAlt.alt.note }}
                </span>
              </template>
            </span>
            <span
              v-if="visIdx > 0"
              class="text-neutral-500 dark:text-neutral-300"
              >{{ recipeT("delimiters.closingBracket") }}</span
            >
          </template>
        </template>
      </template>
      <template v-else-if="item.type === 'cookware'">
        <span class="font-medium text-primary">
          <template v-if="item.quantity">
            <RecipeSingleQuantity :quantity="item.quantity" />
            {{ " " }}
          </template>
          {{ props.recipe.cookware[item.index]?.name }}
        </span>
      </template>
      <template v-else-if="item.type === 'timer'">
        <span
          v-if="props.recipe.timers[item.index]"
          class="font-medium text-teal-600 dark:text-teal-400"
        >
          <RecipeSingleQuantity
            :quantity="props.recipe.timers[item.index]!.duration"
            :unit="props.recipe.timers[item.index]!.unit"
          />
        </span>
      </template>
      <template v-else-if="item.type === 'arbitrary'">
        <span
          v-if="props.recipe.arbitraries[item.index]"
          class="font-medium text-purple-600 dark:text-purple-400"
        >
          <RecipeSingleQuantity
            :quantity="props.recipe.arbitraries[item.index]!.quantity"
            :unit="props.recipe.arbitraries[item.index]!.unit"
          />
          <template v-if="props.recipe.arbitraries[item.index]!.name">
            {{ " " }}{{ props.recipe.arbitraries[item.index]!.name }}
          </template>
        </span>
      </template>
    </template>
  </span>
</template>

<script setup lang="ts">
import {
  formatQuantity,
  formatQuantityWithUnit,
  isSectionActive,
  isStepActive,
  getEffectiveChoices,
  type Recipe,
  type RecipeChoices,
  type Yield,
} from "@tmlmt/cooklang-parser";
import { capitalize } from "#imports";

const props = defineProps<{
  recipe: Recipe;
  stepImagesByNumber?: Record<string, string>;
  editable?: boolean;
}>();

const emit = defineEmits<{
  deleteImage: [imagePath: string];
  "update:scaledRecipe": [recipe: Recipe];
  "update:choices": [choices: RecipeChoices];
}>();

// Internal scaled recipe — shallowRef preserves the Recipe class prototype
const scaledRecipe = shallowRef<Recipe>(props.recipe);

watch(
  () => props.recipe,
  (newRecipe) => {
    scaledRecipe.value = newRecipe;
  },
);

// Variant & Choices
const selectedVariant = ref<string | undefined>(undefined);
const choices = ref<RecipeChoices>({});

watch(scaledRecipe, (r) => emit("update:scaledRecipe", r));
watch(choices, (c) => emit("update:choices", c), { deep: true });

const hasVariants = computed(
  () => (scaledRecipe.value.choices.variants.length ?? 0) > 0,
);

const variantMenuItems = computed(() => {
  const items = [
    {
      label: "Default",
      onSelect: () => {
        selectedVariant.value = undefined;
        choices.value = getEffectiveChoices(scaledRecipe.value, undefined);
      },
    },
  ];
  for (const variant of scaledRecipe.value.choices.variants) {
    if (variant === "*") continue;
    items.push({
      label: variant,
      onSelect: () => {
        selectedVariant.value = variant;
        choices.value = getEffectiveChoices(scaledRecipe.value, variant);
      },
    });
  }
  return items;
});

const filteredIngredients = computed(() => {
  return scaledRecipe.value
    .getIngredientQuantities({ choices: choices.value })
    .filter((ing) => !ing.flags?.includes("hidden") && ing.usedAsPrimary);
});

const filteredCookware = computed(() => {
  return scaledRecipe.value.getCookwareForVariant({
    choices: choices.value,
  });
});

const sectionsWithStepNumbers = computed(() => {
  let stepCounter = 0;
  const activeVariant = choices.value?.variant;
  return scaledRecipe.value.sections.map((section) => {
    const sectionIsActive = isSectionActive(section, activeVariant);
    const contentWithNumbers = section.content.map((item) => {
      if (item.type === "step") {
        const stepIsActive =
          sectionIsActive && isStepActive(item, activeVariant);
        const stepNumber = stepIsActive ? ++stepCounter : null;
        const stepImage = stepNumber
          ? props.stepImagesByNumber?.[String(stepNumber)]
          : undefined;
        return {
          ...item,
          stepNumber,
          stepImage,
          active: stepIsActive,
          optional: item.optional,
        };
      }
      return {
        ...item,
        stepNumber: null,
        stepImage: undefined,
        active: sectionIsActive,
        optional: false,
      };
    });
    return {
      name: section.name,
      active: sectionIsActive,
      variants: section.variants,
      optional: section.optional,
      content: contentWithNumbers,
    };
  });
});

// Scaling
const originalServings = computed(() => props.recipe.servings ?? 1);

const servingsSpinner = computed({
  get: () => scaledRecipe.value.servings ?? 1,
  set: (value) => {
    if (value) {
      scaledRecipe.value = props.recipe.scaleTo(value);
    }
  },
});

const servingsStep = computed(() => {
  const base = originalServings.value;
  if (!base) return 1;
  if (Number.isInteger(base)) {
    return 10 ** (String(base).match(/0+$/) || [""])[0].length;
  }
  if (base < 1) return base;
  let n = 2;
  while (base / n >= 1) n++;
  return base / n;
});

const { $t, $ts, $tc } = useI18n();

// Step image overlay
const visibleStepOverlay = ref<string | null>(null);
</script>

<template>
  <div class="mt-4 grid grid-cols-1 md:mt-5 md:grid-cols-3">
    <div class="grid md:mb-4">
      <USeparator
        :ui="{ border: 'border-gray-200' }"
        size="xs"
        class="mb-4 md:pr-10"
      />
      <div class="flex flex-row items-center">
        <div class="mr-2 text-sm">{{ $t("recipe.scale") }}</div>
        <UInputNumber
          v-model="servingsSpinner"
          :step="servingsStep"
          :min="servingsStep"
          :ui="{ base: 'w-22' }"
          :focus-on-change="false"
          size="sm"
        />
        <UButton
          v-if="servingsSpinner !== originalServings"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="servingsSpinner = originalServings"
        />
        <UDropdownMenu
          v-if="hasVariants"
          :items="variantMenuItems"
          :content="{ align: 'start' }"
          class="ml-4"
        >
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :label="selectedVariant ?? $ts('defaultVariant')"
            icon="i-lucide-git-branch"
          />
        </UDropdownMenu>
        <slot
          name="scale-actions"
          :servings="servingsSpinner"
          :choices="choices"
          :selected-variant="selectedVariant"
          :scaled-recipe="scaledRecipe"
        />
      </div>
    </div>

    <div class="col-start-1">
      <USeparator
        :ui="{ border: 'border-gray-600' }"
        size="sm"
        class="mt-4 h-px md:mt-0 md:pr-10"
      />
      <h2 class="mt-1 mb-2 text-2xl font-bold">
        {{ $t("recipe.ingredients") }}
      </h2>
      <p v-if="scaledRecipe.metadata.yield" class="mb-4 text-sm">
        <b>{{ $t("recipe.yield") }}:</b>
        {{ (scaledRecipe.metadata.yield as Yield).textBefore ?? "" }}
        {{
          formatQuantityWithUnit(
            (scaledRecipe.metadata.yield as Yield).quantity,
            (scaledRecipe.metadata.yield as Yield).unit,
          )
        }}
        {{ (scaledRecipe.metadata.yield as Yield).textAfter ?? "" }}
      </p>
      <p v-else-if="scaledRecipe.servings" class="mb-4 text-sm">
        <b>{{ $t("recipe.yield") }}:</b>
        {{ $tc("recipe.servings", scaledRecipe.servings) }}
      </p>
      <IngredientList
        :ingredients="filteredIngredients"
        :all-ingredients="scaledRecipe.ingredients"
        :interactive="false"
        :desktop-columns="1"
      />
      <template v-if="filteredCookware.length > 0">
        <!-- Desktop: always visible -->
        <div class="mt-6 hidden md:block">
          <h2 class="mb-2 text-2xl font-bold">{{ $t("recipe.cookware") }}</h2>
          <ul class="ml-6 list-disc">
            <li v-for="item in filteredCookware" :key="item.name">
              {{ item.name }}
              <span v-if="item.quantity" class="text-neutral-500">
                ({{ formatQuantity(item.quantity) }})
              </span>
            </li>
          </ul>
        </div>
        <!-- Mobile: collapsible, collapsed by default -->
        <div class="mt-6 md:hidden">
          <UCollapsible>
            <UButton
              class="group"
              :label="$ts('recipe.cookware')"
              color="neutral"
              variant="soft"
              trailing-icon="i-lucide-chevron-down"
              size="sm"
              :ui="{
                trailingIcon:
                  'group-data-[state=open]:rotate-180 transition-transform duration-200',
              }"
            />
            <template #content>
              <ul class="mt-2 ml-6 list-disc">
                <li v-for="item in filteredCookware" :key="item.name">
                  {{ item.name }}
                  <span v-if="item.quantity" class="text-neutral-500">
                    ({{ formatQuantity(item.quantity) }})
                  </span>
                </li>
              </ul>
            </template>
          </UCollapsible>
        </div>
      </template>
    </div>
    <div class="col-span-2">
      <USeparator
        :ui="{ border: 'border-gray-600' }"
        size="sm"
        class="mt-10 h-px md:mt-0 md:pr-0"
      />
      <h2 class="mt-1 mb-4 text-2xl font-bold">
        {{ $t("recipe.preparation") }}
      </h2>
      <div v-for="(section, sIdx) in sectionsWithStepNumbers" :key="sIdx">
        <!-- Optional sections behind collapsible -->
        <template v-if="section.optional && section.active">
          <UCollapsible class="mb-4">
            <UButton
              class="group"
              :label="section.name || $ts('recipe.optionalSection')"
              color="neutral"
              variant="soft"
              trailing-icon="i-lucide-chevron-down"
              size="sm"
              :ui="{
                trailingIcon:
                  'group-data-[state=open]:rotate-180 transition-transform duration-200',
              }"
            >
              <template #leading>
                <span class="text-xs text-neutral-500">(optional)</span>
              </template>
            </UButton>
            <template #content>
              <div class="mt-2 ml-2 opacity-70">
                <div
                  v-for="(item, cIdx) in section.content"
                  :key="cIdx"
                  class="mb-4"
                >
                  <div v-if="item.type === 'note'" class="italic">
                    {{ $t("recipe.note") }}
                    <RecipeNoteContent :note="item" :recipe="scaledRecipe" />
                  </div>
                  <div v-if="item.type === 'step' && item.active">
                    <h3 class="text-lg font-semibold">
                      <span v-if="item.optional" class="font-normal"
                        >({{ capitalize($ts("basics.optional")) }})
                      </span>
                      <template v-if="item.active"
                        >{{ $t("recipe.step") }} {{ item.stepNumber }}</template
                      >
                    </h3>
                    <div v-if="item.stepImage" class="group/step relative">
                      <NuxtImg
                        v-slot="{ src, isLoaded, imgAttrs }"
                        :custom="true"
                        :src="item.stepImage"
                        :alt="`Step ${item.stepNumber} illustration`"
                        sizes="640px md:512px lg:683px xl:853px 2xl:1024px"
                        loading="lazy"
                        class="my-2 max-h-72 w-full rounded-lg object-cover"
                        @click="
                          visibleStepOverlay =
                            visibleStepOverlay === item.stepImage
                              ? null
                              : item.stepImage
                        "
                      >
                        <!-- Show the actual image when loaded -->
                        <img v-if="isLoaded" v-bind="imgAttrs" :src="src" />

                        <!-- Show a placeholder while loading -->
                        <USkeleton v-else class="h-72 w-full" />
                      </NuxtImg>
                      <UButton
                        v-if="
                          editable && item.stepImage.startsWith('/recipes/')
                        "
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="solid"
                        size="xs"
                        class="absolute top-3 right-3 opacity-0 transition-opacity group-hover/step:opacity-100"
                        :class="{
                          'opacity-100!': visibleStepOverlay === item.stepImage,
                        }"
                        @click="emit('deleteImage', item.stepImage)"
                      />
                    </div>
                    <PreparationItem
                      :step="item"
                      :recipe="scaledRecipe"
                      :choices="choices"
                    />
                  </div>
                </div>
              </div>
            </template>
          </UCollapsible>
        </template>
        <!-- Active, non-optional sections rendered normally -->
        <template v-else-if="section.active">
          <h3 v-if="section.name" class="mb-6 text-2xl">
            {{ section.name }}
            <span
              v-if="section.variants"
              class="text-sm font-normal text-neutral-400"
            >
              [{{ section.variants.join(", ") }}]
            </span>
          </h3>
          <div
            v-for="(item, cIdx) in section.content"
            :key="cIdx"
            class="mb-4"
            :class="{ 'opacity-30': !item.active }"
          >
            <div v-if="item.type === 'note'" class="italic">
              {{ $t("recipe.note") }}
              <RecipeNoteContent :note="item" :recipe="scaledRecipe" />
            </div>
            <div v-if="item.type === 'step' && item.active">
              <h3 class="text-lg font-semibold">
                <span v-if="item.optional" class="font-normal"
                  >({{ capitalize($ts("basics.optional")) }})
                </span>
                <template v-if="item.active"
                  >{{ $t("recipe.step") }} {{ item.stepNumber }}</template
                >
              </h3>
              <div v-if="item.stepImage" class="group/step relative">
                <NuxtImg
                  :src="item.stepImage"
                  :alt="`Step ${item.stepNumber} illustration`"
                  sizes="640px md:512px lg:683px xl:853px 2xl:1024px"
                  loading="lazy"
                  class="my-2 max-h-72 w-full rounded-lg object-cover"
                  @click="
                    visibleStepOverlay =
                      visibleStepOverlay === item.stepImage
                        ? null
                        : item.stepImage
                  "
                />
                <UButton
                  v-if="editable && item.stepImage.startsWith('/recipes/')"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="solid"
                  size="xs"
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover/step:opacity-100"
                  :class="{
                    'opacity-100!': visibleStepOverlay === item.stepImage,
                  }"
                  @click="emit('deleteImage', item.stepImage)"
                />
              </div>
              <PreparationItem
                :step="item"
                :recipe="scaledRecipe"
                :choices="choices"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

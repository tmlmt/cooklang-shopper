<script setup lang="ts">
import {
  Recipe,
  formatQuantity,
  formatQuantityWithUnit,
  isSectionActive,
  isStepActive,
  getEffectiveChoices,
  type RecipeChoices,
  type Yield,
  type MetadataTime,
  type MetadataSource,
  type MetadataObject,
} from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";

definePageMeta({
  title: "Cooklang Shopper - Recipe detail",
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

const toast = useToast();
const route = useRoute();
const router = useRouter();

if (!route.params.path) {
  throw createError({
    statusCode: 404,
    statusMessage: "Recipe not found",
  });
}

const pathParams =
  typeof route.params.path === "string"
    ? [route.params.path]
    : route.params.path;

const dir = [
  "Recipes",
  ...pathParams.reduce((acc, item) => {
    acc.push("/");
    acc.push(item);
    return acc;
  }, [] as string[]),
];

const path = pathParams.join("/");
const recipeDir = path.substring(0, path.lastIndexOf("/"));
const recipeName = path.substring(path.lastIndexOf("/") + 1);

// Regex-based validation of provided path
if (!/^(?!\/)(?:[\p{L}\p{N}_ +%.-]+\/)*[\p{L}\p{N}_ +%.-]+$/u.test(path)) {
  throw createError({
    statusCode: 400,
    statusMessage: "Invalid recipe path",
  });
}

const shoppingStore = useShoppingStore();
const recipeStore = useRecipeStore();
const { experimental } = usePublicConfig();

const rawRecipe = ref<string>();

if (route.query.mode === "new") {
  rawRecipe.value = "";
} else {
  const res = await useFetch(`/api/recipe/${path}`);

  if (res.error.value) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  rawRecipe.value = String(res.data.value);
}

const recipe = ref<Recipe>();
const originalServings = ref<number>();
watch(
  rawRecipe,
  (newRawRecipe) => {
    if (newRawRecipe) {
      recipe.value = new Recipe(newRawRecipe);
      originalServings.value = recipe.value.servings;
      const servings = shoppingStore.getServings(path);
      if (servings) recipe.value = recipe.value.scaleTo(servings);
    }
  },
  { immediate: true },
);
interface MetadataEntry {
  key: string;
  value?: string;
  isLink?: boolean;
  subEntries?: Array<Array<{ key: string; value: string }>>;
}

const formatMetadataValue = (val: unknown): string => {
  if (val === undefined || val === null) return "";
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(formatMetadataValue).join(", ");
  if (typeof val === "object")
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${formatMetadataValue(v)}`)
      .join(", ");
  return String(val);
};

const nonTitleMetaData = computed(() => {
  if (!recipe.value) return [] as MetadataEntry[];
  const entries: MetadataEntry[] = [];
  const metadata = recipe.value.metadata;

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "title") continue;
    if (value === undefined || value === null) continue;

    if (key === "yield") {
      const yieldValue = value as Yield;
      entries.push({
        key: "yield",
        value:
          `${yieldValue.textBefore ?? ""} ${formatQuantityWithUnit(yieldValue.quantity, yieldValue.unit)} ${yieldValue.textAfter ?? ""}`.trim(),
      });
      continue;
    }

    if (key === "time") {
      const timeValue = value as MetadataTime;
      if (timeValue.prep)
        entries.push({ key: "prep time", value: timeValue.prep });
      if (timeValue.cook)
        entries.push({ key: "cook time", value: timeValue.cook });
      if (timeValue.total)
        entries.push({ key: "total time", value: timeValue.total });
      continue;
    }

    if (key === "source") {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const sourceValue = value as MetadataSource;
        const parts: string[] = [];
        if (sourceValue.name) parts.push(sourceValue.name);
        if (sourceValue.author) parts.push(`by ${sourceValue.author}`);
        if (sourceValue.url) {
          entries.push({
            key: "source",
            value:
              parts.length > 0
                ? `${parts.join(" ")} (${sourceValue.url})`
                : sourceValue.url,
            isLink: true,
          });
        } else {
          entries.push({ key: "source", value: parts.join(" ") });
        }
      } else {
        const strVal = String(value);
        entries.push({
          key: "source",
          value: strVal,
          isLink: strVal.startsWith("http"),
        });
      }
      continue;
    }

    if (key === "servings" || key === "serves") {
      entries.push({ key, value: String(value) });
      continue;
    }

    if (Array.isArray(value)) {
      const hasObjects = value.some(
        (item) => typeof item === "object" && item !== null,
      );
      if (hasObjects) {
        const subEntries = value.map((item) => {
          if (typeof item === "object" && item !== null) {
            const obj = item as MetadataObject;
            return Object.entries(obj).map(([k, v]) => ({
              key: k,
              value: formatMetadataValue(v),
            }));
          }
          return [{ key: "", value: String(item) }];
        });
        entries.push({ key, subEntries });
      } else {
        entries.push({ key, value: value.join(", ") });
      }
    } else if (typeof value === "object" && value !== null) {
      const obj = value as MetadataObject;
      const subEntries = [
        Object.entries(obj).map(([k, v]) => ({
          key: k,
          value: formatMetadataValue(v),
        })),
      ];
      entries.push({ key, subEntries });
    } else {
      entries.push({ key, value: String(value) });
    }
  }

  return entries;
});

//---------------------
// Variant & Choices
//---------------------

const selectedVariant = ref<string | undefined>(undefined);
const choices = ref<RecipeChoices>({});

const hasVariants = computed(
  () => (recipe.value?.choices.variants.length ?? 0) > 0,
);

const variantMenuItems = computed<DropdownMenuItem[]>(() => {
  if (!recipe.value) return [];
  const items: DropdownMenuItem[] = [
    {
      label: "Default",
      onSelect: () => {
        selectedVariant.value = undefined;
        choices.value = getEffectiveChoices(recipe.value!, undefined);
      },
    },
  ];
  for (const variant of recipe.value.choices.variants) {
    if (variant === "*") continue;
    items.push({
      label: variant,
      onSelect: () => {
        selectedVariant.value = variant;
        choices.value = getEffectiveChoices(recipe.value!, variant);
      },
    });
  }
  return items;
});

const filteredIngredients = computed(() => {
  if (!recipe.value) return [];
  const ingredients = recipe.value.getIngredientQuantities({
    choices: choices.value,
  });
  return ingredients.filter(
    (ing) => !ing.flags?.includes("hidden") && ing.usedAsPrimary,
  );
});

const filteredCookware = computed(() => {
  if (!recipe.value) return [];
  return recipe.value.getCookwareForVariant({ choices: choices.value });
});

const sectionsWithStepNumbers = computed(() => {
  if (!recipe.value) return [];
  let stepCounter = 0;
  const activeVariant = choices.value?.variant;
  return recipe.value.sections.map((section) => {
    const sectionIsActive = isSectionActive(section, activeVariant);
    const contentWithNumbers = section.content.map((item) => {
      if (item.type === "step") {
        const stepIsActive =
          sectionIsActive && isStepActive(item, activeVariant);
        const stepNumber = stepIsActive ? ++stepCounter : null;
        return {
          ...item,
          stepNumber,
          active: stepIsActive,
          optional: item.optional,
        };
      }
      return {
        ...item,
        stepNumber: null,
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

//---------------------------
// Edit, Move, Delete recipe
//---------------------------

const isEditMode = ref(
  route.query.mode === "edit" || route.query.mode === "new",
);
const isManualEdit = ref(false);
const modalFile = await useModalFile();
const modalConf = await useModalConfirmation();
const modalChoices = await useModalChoices();

const menuItems = ref<DropdownMenuItem[]>([
  {
    label: "Edit",
    icon: "prime:file-edit",
    onSelect: () => {
      isEditMode.value = true;
      isManualEdit.value = true;
    },
  },
  {
    label: "Move",
    icon: "prime:arrow-right",
    onSelect: async () => {
      const result = await modalFile.open(
        "move",
        path,
        recipe.value?.metadata.title,
      );
      if (result) {
        await $fetchWithHeaders(`/api/recipe/${path}`, {
          method: "PATCH",
          body: {
            dir: result.dir,
            fileName: result.name,
          },
        });
        recipeStore.moveRecipe(recipeName, recipeDir, result.name, result.dir);
        toast.add({
          title: "Success",
          description: `Recipe moved to ${result.dir}/${result.name}`,
          color: "success",
        });
        await navigateTo(
          `/recipe/${result.dir ? result.dir + "/" : ""}${result.name}`,
        );
      }
    },
  },
  {
    label: "Delete",
    icon: "prime:trash",
    color: "error",
    onSelect: async () => {
      const result = await modalConf.open(
        "Are you sure you want to delete this recipe?",
      );
      if (result) {
        // Delete recipe
        await $fetchWithHeaders(`/api/recipe/${path}`, {
          method: "DELETE",
        });

        // Remove from store index
        recipeStore.removeRecipe(recipeName, recipeDir);

        // Remove from selected list (if present)
        shoppingStore.removeRecipe(path);

        // Show success toast
        toast.add({
          title: "Success",
          description: "Recipe deleted",
          color: "success",
        });

        await navigateTo("/");
      }
    },
  },
]);

//---------------------
// View / Edit Recipe
//---------------------

const formState = ref({
  recipe: rawRecipe.value ?? "",
});

const isParsableRecipe = (value: string): boolean => {
  try {
    new Recipe(value);
    return true;
  } catch {
    return false;
  }
};

const schema = v.object({
  recipe: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Please enter a recipe"),
    v.check(isParsableRecipe, "Invalid recipe. Check syntax"),
  ),
});

type Schema = v.InferOutput<typeof schema>;

const onEditSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (route.query.mode === "edit" || isManualEdit.value) {
    try {
      await $fetchWithHeaders(`/api/recipe/${path}`, {
        method: "PUT",
        body: { recipe: event.data.recipe },
      });
      toast.add({
        color: "success",
        title: "Success",
        description: "Recipe successfully saved",
        duration: 3000,
      });
      isEditMode.value = false;
      rawRecipe.value = event.data.recipe;
      recipeStore.updateRecipe(recipeName, recipeDir, event.data.recipe);
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: "Error",
          description: error.message,
          duration: 3000,
        });
      }
    }
  } else if (route.query.mode === "new") {
    try {
      await $fetchWithHeaders(`/api/recipes`, {
        method: "POST",
        body: {
          dir: recipeDir,
          name: recipeName,
          content: event.data.recipe,
        },
      });
      toast.add({
        color: "success",
        title: "Success",
        description: "Recipe successfully saved",
        duration: 3000,
      });
      isEditMode.value = false;
      rawRecipe.value = event.data.recipe;
      recipeStore.addRecipe(recipeName, recipeDir, event.data.recipe);
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: "Error",
          description: error.data,
          duration: 3000,
        });
      }
    }
  }
};

const onEditCancel = async () => {
  if (route.query.mode === "new") {
    await router.back();
  } else {
    isEditMode.value = false;
  }
};

defineShortcuts({
  escape: () => {
    if (isEditMode.value && route.query.mode !== "new") {
      isEditMode.value = false;
    }
  },
});

//--------------------
// Scaling
//--------------------

const servingsSpinner = computed({
  get: () => recipe.value?.servings,
  set: (value) => {
    if (value && recipe.value) {
      recipe.value = recipe.value.scaleTo(value);
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

//--------------------
// Shopping List
//--------------------

const hasIngredientChoices = computed(() => {
  if (!recipe.value) return false;
  return (
    recipe.value.choices.ingredientItems.size > 0 ||
    recipe.value.choices.ingredientGroups.size > 0
  );
});

const addToShoppingList = async () => {
  if (!recipe.value?.metadata.title || !servingsSpinner.value) return;

  let choicesToStore: RecipeChoices | undefined = choices.value;

  if (hasIngredientChoices.value) {
    const result = await modalChoices.open(recipe.value, selectedVariant.value);
    if (!result) return; // User cancelled
    choicesToStore = result;
  }

  shoppingStore.addRecipe(
    recipe.value.metadata.title,
    path,
    servingsSpinner.value,
    choicesToStore,
  );
  toast.add({
    color: "success",
    title: "Success",
    description: "Recipe successfully added to shopping list",
    duration: 3000,
  });
};

const editServingsInShoppingList = () => {
  if (recipe.value?.metadata.title && servingsSpinner.value) {
    shoppingStore.editServings(path, servingsSpinner.value, choices.value);
    toast.add({
      color: "success",
      title: "Success",
      description: "Servings successfully modified in shopping list",
      duration: 3000,
    });
  }
};

//---------------------
// Header menu (mobile)
//---------------------

const { setHeaderMenuItems, clearHeaderMenuItems } = useHeaderMenu();

setHeaderMenuItems(
  (
    menuItems.value as {
      label?: string;
      icon?: string;
      onSelect?: (e: Event) => void;
    }[]
  ).map((item) => ({
    label: item.label,
    icon: item.icon,
    onSelect: item.onSelect,
  })),
);

onBeforeRouteLeave(() => {
  clearHeaderMenuItems();
});
</script>

<template>
  <div class="flex w-full px-4 md:px-1">
    <div v-if="recipe && !isEditMode" class="flex w-full flex-col">
      <div class="mb-4 flex flex-col gap-4">
        <div class="mt-5 flex flex-row items-center gap-4 md:mt-0">
          <span v-for="subdir in dir" :key="subdir">{{ subdir }}</span>
        </div>
        <div class="hidden flex-row gap-4 md:flex">
          <h1 class="text-3xl font-bold">
            {{ recipe.metadata.title ?? "(Untitled)" }}
          </h1>
          <UDropdownMenu :items="menuItems" :content="{ align: 'start' }">
            <UButton
              icon="prime:bars"
              size="lg"
              color="secondary"
              variant="soft"
            />
          </UDropdownMenu>
        </div>
        <h1 class="text-2xl font-bold md:hidden">
          {{ recipe.metadata.title ?? "(Untitled)" }}
        </h1>
      </div>
      <div class="mb-4 flex flex-row gap-4">
        <div class="mt-1">Scale:</div>
        <UInputNumber
          v-model="servingsSpinner"
          :step="servingsStep"
          :min="servingsStep"
          :ui="{ base: 'w-24' }"
          :focus-on-change="false"
        />
        <UDropdownMenu
          v-if="hasVariants"
          :items="variantMenuItems"
          :content="{ align: 'start' }"
        >
          <UButton
            size="md"
            color="neutral"
            variant="soft"
            :label="selectedVariant ?? 'Default'"
            icon="i-lucide-git-branch"
          />
        </UDropdownMenu>
        <UButton
          v-if="experimental && !shoppingStore.isRecipeInSelection(path)"
          size="md"
          color="primary"
          label="Add to shopping list"
          icon="material-symbols:add-shopping-cart-rounded"
          @click="addToShoppingList"
        />
        <UButton
          v-else-if="experimental && shoppingStore.isRecipeInSelection(path)"
          size="sm"
          color="secondary"
          @click="editServingsInShoppingList"
          ><Icon class="text-lg" name="material-symbols:change-circle-rounded"
        /></UButton>
      </div>
      <div class="my-4 flex flex-col">
        <ul
          class="ml-6 list-disc text-sm text-neutral-600 dark:text-neutral-400"
        >
          <li v-for="entry in nonTitleMetaData" :key="entry.key">
            <b>{{ entry.key }}: </b>
            <ULink
              v-if="entry.isLink && entry.value"
              :to="entry.value"
              :boolean="true"
              target="_blank"
            >
              {{ entry.value }}
            </ULink>
            <span v-else-if="entry.value">{{ entry.value }}</span>
            <template v-if="entry.subEntries">
              <div
                v-for="(obj, oIdx) in entry.subEntries"
                :key="oIdx"
                class="my-0.5 ml-2 flex flex-row gap-2"
              >
                <div class="text-base">•</div>
                <ul class="mt-[0.1rem] list-inside">
                  <li
                    v-for="(field, fIdx) in obj"
                    :key="fIdx"
                    class="list-none"
                  >
                    <span v-if="field.key" class="font-medium"
                      >{{ field.key }}:</span
                    >
                    {{ field.value }}
                  </li>
                </ul>
              </div>
            </template>
          </li>
        </ul>
      </div>
      <div class="mt-0 grid grid-cols-1 md:mt-4 md:grid-cols-3">
        <div class="col-start-1">
          <USeparator
            :ui="{ border: 'border-gray-600' }"
            size="sm"
            class="mt-4 h-px md:mt-0 md:pr-10"
          />
          <h2 class="mt-1 mb-2 text-2xl font-bold">Ingredients</h2>
          <p v-if="recipe.metadata.yield" class="mb-4 text-sm">
            <b>Yield:</b>
            {{ (recipe.metadata.yield as Yield).textBefore ?? "" }}
            {{
              formatQuantityWithUnit(
                (recipe.metadata.yield as Yield).quantity,
                (recipe.metadata.yield as Yield).unit,
              )
            }}
            {{ (recipe.metadata.yield as Yield).textAfter ?? "" }}
          </p>
          <p v-else-if="recipe.servings" class="mb-4 text-sm">
            <b>Yield:</b> {{ recipe.servings }} servings
          </p>
          <IngredientList
            :ingredients="filteredIngredients"
            :all-ingredients="recipe.ingredients"
          />
          <template v-if="filteredCookware.length > 0">
            <!-- Desktop: always visible -->
            <div class="mt-6 hidden md:block">
              <h2 class="mb-2 text-2xl font-bold">Cookware</h2>
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
                  label="Cookware"
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
          <h2 class="mt-1 mb-4 text-2xl font-bold">Preparation</h2>
          <div v-for="(section, sIdx) in sectionsWithStepNumbers" :key="sIdx">
            <!-- Optional/inactive sections behind collapsible -->
            <template v-if="section.optional || !section.active">
              <UCollapsible class="mb-4">
                <UButton
                  class="group"
                  :label="section.name || 'Optional section'"
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
                    <span
                      v-if="!section.active"
                      class="text-xs text-neutral-500"
                      >(inactive)</span
                    >
                    <span
                      v-else-if="section.optional"
                      class="text-xs text-neutral-500"
                      >(optional)</span
                    >
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
                        Note:
                        <RecipeNoteContent :note="item" :recipe="recipe!" />
                      </div>
                      <div v-if="item.type === 'step'">
                        <h3 class="text-lg font-semibold">
                          <span v-if="item.optional" class="font-normal"
                            >(Optional)
                          </span>
                          <template v-if="item.active"
                            >Step {{ item.stepNumber }}</template
                          >
                          <template v-else>Step (inactive)</template>
                        </h3>
                        <PreparationItem
                          :step="item"
                          :recipe="recipe!"
                          :choices="choices"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </UCollapsible>
            </template>
            <!-- Active, non-optional sections rendered normally -->
            <template v-else>
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
                  Note:
                  <RecipeNoteContent :note="item" :recipe="recipe!" />
                </div>
                <div v-if="item.type === 'step'">
                  <h3 class="text-lg font-semibold">
                    <span v-if="item.optional" class="font-normal"
                      >(Optional)
                    </span>
                    <template v-if="item.active"
                      >Step {{ item.stepNumber }}</template
                    >
                    <template v-else>Step (inactive)</template>
                  </h3>
                  <PreparationItem
                    :step="item"
                    :recipe="recipe!"
                    :choices="choices"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="mt-4 flex w-full flex-col gap-4 md:mt-0">
      <div class="flex flex-row gap-4">
        <span v-for="subdir in dir" :key="subdir">{{ subdir }}</span>
      </div>
      <UForm
        :state="formState"
        :schema="schema"
        class="flex w-full flex-col"
        @submit="onEditSubmit"
      >
        <UFormField name="recipe" :required="true">
          <UTextarea
            v-model="formState.recipe"
            class="w-full"
            :rows="20"
            fluid
          />
        </UFormField>
        <div class="mt-4 flex flex-row gap-4">
          <UButton type="submit" label="Save" class="resize-y" />
          <UButton
            type="button"
            color="secondary"
            label="Cancel"
            @click="onEditCancel"
          />
        </div>
      </UForm>
    </div>
  </div>
</template>

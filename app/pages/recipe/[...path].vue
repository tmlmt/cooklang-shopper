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
} from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";
import { validateRecipePath } from "~~/shared/utils/path";

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
const recipePathRef = computed(() => path);

// Validate provided path
validateRecipePath(path);

const shoppingStore = useShoppingStore();
const recipeStore = useRecipeStore();
const { experimental } = usePublicConfig();
const {
  heroImages,
  stepImagesByNumber,
  status: imageManifestStatus,
  refresh: refreshImageManifest,
} = useRecipeImageManifest(recipePathRef);

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
        const stepImage = stepNumber
          ? stepImagesByNumber.value[String(stepNumber)]
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
const modalImageUpload = await useModalImageUpload();

// Image management
const uploadingImage = ref(false);
const heroOverlayVisible = ref(false);
const visibleStepOverlay = ref<string | null>(null);

const availableUploadRoles = computed(() => {
  const roles: { label: string; value: string }[] = [
    { label: "Cover", value: "cover" },
  ];
  let maxStep = 0;
  for (const section of sectionsWithStepNumbers.value) {
    for (const item of section.content) {
      if (item.type === "step" && item.stepNumber) {
        maxStep = Math.max(maxStep, item.stepNumber);
      }
    }
  }
  for (let i = 1; i <= maxStep; i++) {
    roles.push({ label: `Step ${i}`, value: `step-${i}` });
  }
  return roles;
});

async function openUploadModal() {
  const result = await modalImageUpload.open(availableUploadRoles.value);
  if (!result) return;

  uploadingImage.value = true;
  try {
    const formData = new FormData();
    formData.append("file", result.file);
    formData.append("role", result.role);

    await $fetchWithHeaders(`/api/recipe-images/${path}`, {
      method: "POST",
      body: formData,
    });

    await refreshImageManifest();
    clearRecipeCoverImageCache();

    toast.add({
      title: "Success",
      description: "Image uploaded",
      color: "success",
    });
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      toast.add({
        color: "error",
        title: "Error",
        description: error.message,
        duration: 3000,
      });
    }
  } finally {
    uploadingImage.value = false;
  }
}

async function deleteImage(imagePath: string) {
  const result = await modalConf.open(
    "Are you sure you want to delete this image?",
    "Delete",
    "Cancel",
  );
  if (!result) return;

  try {
    await $fetchWithHeaders(`/api/recipe-images/${path}`, {
      method: "DELETE",
      body: { imagePath },
    });

    await refreshImageManifest();
    clearRecipeCoverImageCache();

    toast.add({
      title: "Success",
      description: "Image deleted",
      color: "success",
    });
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
}

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
// Header actions
//---------------------

const { setHeaderActions } = useHeaderMenu();

setHeaderActions(menuItems.value as DropdownMenuItem[]);
</script>

<template>
  <div class="flex w-full px-4 md:px-1">
    <div v-if="recipe && !isEditMode" class="flex w-full flex-col">
      <div v-if="imageManifestStatus === 'pending'" class="mb-4 md:mb-6">
        <USkeleton class="h-64 w-full rounded-sm" />
      </div>
      <div v-else-if="heroImages.length > 0" class="md:mb-6">
        <UCarousel
          v-slot="{ item, index }"
          :items="heroImages"
          :arrows="heroImages.length > 1"
          :dots="heroImages.length > 1"
          :ui="{
            dots: 'bottom-4 md:-bottom-8',
            prev: 'sm:inset-s-8 cursor-pointer',
            next: 'sm:inset-e-8 cursor-pointer',
          }"
          loop
          class="w-full"
        >
          <div class="group relative">
            <NuxtImg
              :src="item"
              :alt="`${recipe.metadata.title ?? recipeName}${heroImages.length > 1 ? ` image ${index + 1}` : ''}`"
              sizes="640px md:768px lg:1024px xl:1280px 2xl:1536px"
              class="max-h-112 w-full rounded-sm object-cover"
              @click="heroOverlayVisible = !heroOverlayVisible"
            />
            <div
              class="absolute top-3 right-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 md:top-6 md:right-6 md:gap-3"
              :class="{ 'opacity-100!': heroOverlayVisible }"
            >
              <UButton
                icon="i-lucide-upload"
                color="neutral"
                variant="soft"
                size="md"
                class="hidden md:inline-flex"
                @click="openUploadModal()"
              />
              <UButton
                v-if="item.startsWith('/recipes/')"
                icon="i-lucide-trash-2"
                color="error"
                variant="solid"
                size="md"
                class="hidden md:inline-flex"
                @click="deleteImage(item)"
              />
              <UButton
                icon="i-lucide-upload"
                color="neutral"
                variant="soft"
                size="sm"
                class="flex md:hidden"
                @click="openUploadModal()"
              />
              <UButton
                v-if="item.startsWith('/recipes/')"
                icon="i-lucide-trash-2"
                color="error"
                variant="solid"
                size="sm"
                class="flex md:hidden"
                @click="deleteImage(item)"
              />
            </div>
          </div>
        </UCarousel>
      </div>

      <div class="mb-2 flex flex-col gap-4">
        <div
          class="mt-5 flex flex-row items-center gap-4 text-sm md:mt-0 md:text-base"
        >
          <span v-for="subdir in dir" :key="subdir">{{ subdir }}</span>
        </div>
        <h1 class="hidden text-3xl font-bold md:block">
          {{ recipe.metadata.title ?? "(Untitled)" }}
        </h1>
        <h1 class="text-2xl font-bold md:hidden">
          {{ recipe.metadata.title ?? "(Untitled)" }}
        </h1>
      </div>
      <RecipeMetadataBlock :recipe="recipe" />
      <div class="mt-4 grid grid-cols-1 md:mt-5 md:grid-cols-3">
        <div class="grid md:mb-4">
          <USeparator
            :ui="{ border: 'border-gray-200' }"
            size="xs"
            class="mb-4 md:pr-10"
          />
          <div class="flex flex-row items-center gap-4">
            <div class="text-sm">Scale:</div>
            <UInputNumber
              v-model="servingsSpinner"
              :step="servingsStep"
              :min="servingsStep"
              :ui="{ base: 'w-20' }"
              :focus-on-change="false"
              size="sm"
            />
            <UDropdownMenu
              v-if="hasVariants"
              :items="variantMenuItems"
              :content="{ align: 'start' }"
            >
              <UButton
                size="sm"
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
              v-else-if="
                experimental && shoppingStore.isRecipeInSelection(path)
              "
              size="sm"
              color="secondary"
              @click="editServingsInShoppingList"
              ><Icon
                class="text-lg"
                name="material-symbols:change-circle-rounded"
            /></UButton>
          </div>
        </div>

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
                            v-if="item.stepImage.startsWith('/recipes/')"
                            icon="i-lucide-trash-2"
                            color="error"
                            variant="solid"
                            size="xs"
                            class="absolute top-3 right-3 opacity-0 transition-opacity group-hover/step:opacity-100"
                            :class="{
                              'opacity-100!':
                                visibleStepOverlay === item.stepImage,
                            }"
                            @click="deleteImage(item.stepImage)"
                          />
                        </div>
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
                      v-if="item.stepImage.startsWith('/recipes/')"
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="solid"
                      size="xs"
                      class="absolute top-3 right-3 opacity-0 transition-opacity group-hover/step:opacity-100"
                      :class="{
                        'opacity-100!': visibleStepOverlay === item.stepImage,
                      }"
                      @click="deleteImage(item.stepImage)"
                    />
                  </div>
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
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
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

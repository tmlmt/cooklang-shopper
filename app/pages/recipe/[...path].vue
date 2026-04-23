<script setup lang="ts">
import { Recipe, type RecipeChoices } from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";

definePageMeta({
  title: "Recipe detail",
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

const dirSegments = [
  "Recipes",
  ...pathParams.reduce((acc, item) => {
    acc.push(" / ");
    acc.push(item);
    return acc;
  }, [] as string[]),
];

const maxBreadcrumbLengthMobile = 60;
const maxBreadcrumbLengthDesktop = 180;

function truncateDir(maxLength: number) {
  const full = dirSegments.join("");
  if (full.length <= maxLength) return dirSegments;

  let length = 1; // for "\u2026"
  let startIndex = dirSegments.length;
  for (let i = dirSegments.length - 1; i >= 0; i--) {
    const seg = dirSegments[i]!;
    if (length + seg.length > maxLength) break;
    length += seg.length;
    startIndex = i;
  }
  if (startIndex >= dirSegments.length) startIndex = dirSegments.length - 1;
  const kept = dirSegments.slice(startIndex);
  if (kept[0] === " / ") kept.shift();
  return ["\u2026", " / ", ...kept];
}

const displayDirMobile = computed(() => truncateDir(maxBreadcrumbLengthMobile));
const displayDirDesktop = computed(() =>
  truncateDir(maxBreadcrumbLengthDesktop),
);

const path = pathParams.join("/");
const recipeDir = path.substring(0, path.lastIndexOf("/"));
const recipeName = path.substring(path.lastIndexOf("/") + 1);
const recipePathRef = computed(() => (route.query.mode === "new" ? "" : path));

// Validate provided path
validateRecipePath(path);

const shoppingStore = useShoppingStore();
const recipeStore = useRecipeStore();
const { viewerCanShare } = await usePublicConfig();
const { shoppingEnabled } = await useShoppingEnabled();
if (shoppingEnabled.value) {
  await shoppingStore.init();
}
const { loggedIn } = useUserSession();
const { isEditor } = useRole();
const {
  heroImages,
  stepImagesByNumber,
  status: imageManifestStatus,
  refresh: refreshImageManifest,
} = await useRecipeImageManifest(recipePathRef);

const rawRecipe = ref<string>();

if (route.query.mode === "new") {
  rawRecipe.value = "";
} else {
  const res = await useFetch(`/api/recipe/${path}`);

  if (res.error.value) {
    if (res.error.value.statusCode === 401) {
      await navigateTo("/auth", { replace: true });
    }
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  rawRecipe.value = String(res.data.value);
}

const recipe = shallowRef<Recipe>();
watch(
  rawRecipe,
  (newRawRecipe) => {
    if (newRawRecipe) {
      recipe.value = new Recipe(newRawRecipe);
      const servings = shoppingStore.getServings(path);
      if (servings) recipe.value = recipe.value.scaleTo(servings);
    }
  },
  { immediate: true },
);

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
const modalShare = await useModalShare();
const modalCookMode = await useModalCookMode();

// Cook mode state — captured from Content.vue's scale-actions slot
const currentScaledRecipe = shallowRef<Recipe | undefined>(undefined);
const currentChoices = ref<RecipeChoices>({});

// Image management
const uploadingImage = ref(false);
const heroOverlayVisible = ref(false);

const availableUploadRoles = computed(() => {
  const roles: { label: string; value: string }[] = [
    { label: "Cover", value: "cover" },
  ];
  if (!recipe.value) return roles;
  let stepCount = 0;
  for (const section of recipe.value.sections) {
    for (const item of section.content) {
      if (item.type === "step") stepCount++;
    }
  }
  for (let i = 1; i <= stepCount; i++) {
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
      });
    }
  }
}

const recipeKey = path.replace(/\//g, ":");

const uploadImageItem: DropdownMenuItem = {
  label: "Upload image",
  icon: "i-lucide-upload",
  onSelect: openUploadModal,
};

const downloadItem: DropdownMenuItem = {
  label: "Download .cook",
  icon: "i-lucide-download",
  onSelect: () => {
    if (rawRecipe.value !== undefined) {
      downloadCook(rawRecipe.value, recipeName);
    }
  },
};

const menuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = [];

  if (isEditor.value || viewerCanShare.value) {
    items.push({
      label: "Share",
      icon: "prime:share-alt",
      onSelect: () => {
        modalShare.open(recipeKey);
      },
    });
  }

  if (isEditor.value) {
    items.push(
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
            recipeStore.moveRecipe(
              recipeName,
              recipeDir,
              result.name,
              result.dir,
            );
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
            await $fetchWithHeaders(`/api/recipe/${path}`, {
              method: "DELETE",
            });

            recipeStore.removeRecipe(recipeName, recipeDir);
            await shoppingStore.removeRecipe(path);

            toast.add({
              title: "Success",
              description: "Recipe deleted",
              color: "success",
            });

            await navigateTo("/");
          }
        },
      },
    );
  }

  return items;
});

//---------------------
// View / Edit Recipe
//---------------------

const newRecipePlaceholder = `---
title: ${recipeName}
servings:
---
`;

const formState = ref({
  recipe: rawRecipe.value || newRecipePlaceholder,
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
// Shopping List
//--------------------

function hasIngredientChoicesForVariant(
  currentRecipe: Recipe,
  variant?: string,
): boolean {
  const choices = currentRecipe.getChoicesForVariant(variant);
  return choices.ingredientItems.size > 0 || choices.ingredientGroups.size > 0;
}

const addToShoppingList = async (
  scaledRecipe: Recipe,
  servings: number | undefined,
  currentChoices: RecipeChoices,
  currentVariant: string | undefined,
) => {
  if (!scaledRecipe.metadata.title || !servings) return;

  let choicesToStore: RecipeChoices | undefined = currentChoices;

  if (hasIngredientChoicesForVariant(scaledRecipe, currentVariant)) {
    const result = await modalChoices.open(scaledRecipe, currentVariant);
    if (!result) return; // User cancelled
    choicesToStore = result;
  }

  await shoppingStore.addRecipe(
    scaledRecipe.metadata.title,
    path,
    servings,
    choicesToStore,
  );
  toast.add({
    color: "success",
    title: "Success",
    description: "Recipe successfully added to shopping list",
  });
};

const editServingsInShoppingList = async (
  scaledRecipe: Recipe,
  servings: number | undefined,
  currentChoices: RecipeChoices,
  selectedVariant: string | undefined,
) => {
  if (recipe.value?.metadata.title && servings) {
    let choicesToStore = currentChoices;

    const existingChoices = shoppingStore.recipeSelection.find(
      (r) => r.path === path,
    )?.choices;
    const modalVariant = existingChoices?.variant ?? selectedVariant;
    if (hasIngredientChoicesForVariant(scaledRecipe, modalVariant)) {
      const confirmedChoices = await modalChoices.open(
        scaledRecipe,
        modalVariant,
        existingChoices,
      );

      if (!confirmedChoices) return;
      choicesToStore = confirmedChoices;
    }

    await shoppingStore.editServings(path, servings, choicesToStore);
    toast.add({
      color: "success",
      title: "Success",
      description: "Servings successfully modified in shopping list",
    });
  }
};

//---------------------
// Header actions
//---------------------

const { setHeaderActions, setHeaderMenuItems } = useHeaderMenu();

const openCookMode = () => {
  const r = currentScaledRecipe.value ?? recipe.value;
  if (!r) return;
  modalCookMode.open(r, currentChoices.value, stepImagesByNumber.value);
};

const cookItem: DropdownMenuItem = {
  label: "Cook",
  icon: "i-lucide-cooking-pot",
  color: "secondary",
  variant: "soft",
  onSelect: openCookMode,
};

if (loggedIn.value) {
  if (route.query.mode !== "new") {
    setHeaderActions([cookItem, ...(menuItems.value as DropdownMenuItem[])]);
    setHeaderMenuItems([
      ...(isEditor.value ? [uploadImageItem] : []),
      downloadItem,
    ]);
  }
} else {
  setHeaderActions([cookItem]);
  setHeaderMenuItems([downloadItem]);
}
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
              v-if="isEditor"
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
        <p class="mt-5 text-sm md:hidden">
          <span v-for="(segment, i) in displayDirMobile" :key="i">{{
            segment
          }}</span>
        </p>
        <p class="hidden text-base md:block">
          <span v-for="(segment, i) in displayDirDesktop" :key="i">{{
            segment
          }}</span>
        </p>
        <h1 class="hidden text-3xl font-bold md:block">
          {{ recipe.metadata.title ?? "(Untitled)" }}
        </h1>
        <h1 class="text-2xl font-bold md:hidden">
          {{ recipe.metadata.title ?? "(Untitled)" }}
        </h1>
      </div>
      <RecipeMetadataBlock :recipe="recipe" />
      <RecipeContent
        :recipe="recipe"
        :step-images-by-number="stepImagesByNumber"
        :editable="isEditor"
        @delete-image="deleteImage"
        @update:scaled-recipe="(r) => (currentScaledRecipe = r)"
        @update:choices="(c) => (currentChoices = c)"
      >
        <template
          #scale-actions="{
            servings,
            choices,
            selectedVariant,
            scaledRecipe: sr,
          }"
        >
          <UButton
            v-if="
              loggedIn &&
              shoppingEnabled &&
              !shoppingStore.isRecipeInSelection(path)
            "
            size="sm"
            color="primary"
            label="Add to list"
            icon="material-symbols:add-shopping-cart-rounded"
            class="ml-2"
            @click="addToShoppingList(sr, servings, choices, selectedVariant)"
          />
          <UButton
            v-else-if="
              loggedIn &&
              shoppingEnabled &&
              shoppingStore.isRecipeInSelection(path)
            "
            size="sm"
            class="ml-2"
            color="secondary"
            @click="
              editServingsInShoppingList(sr, servings, choices, selectedVariant)
            "
            ><Icon
              class="text-lg"
              name="material-symbols:change-circle-rounded"
          /></UButton>
        </template>
      </RecipeContent>
    </div>
    <div v-else class="mt-4 flex w-full flex-col gap-4 md:mt-0">
      <p class="text-sm md:hidden">
        <span v-for="(segment, i) in displayDirMobile" :key="i">{{
          segment
        }}</span>
      </p>
      <p class="hidden text-base md:block">
        <span v-for="(segment, i) in displayDirDesktop" :key="i">{{
          segment
        }}</span>
      </p>
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

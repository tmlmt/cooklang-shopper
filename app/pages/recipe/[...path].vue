<script setup lang="ts">
import { Recipe, type RecipeChoices } from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";
import { validateRecipePath } from "~~/shared/utils/path";

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
const { experimental } = await usePublicConfig();
const { loggedIn } = useUserSession();
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

const menuItems = ref<DropdownMenuItem[]>([
  {
    label: "Share",
    icon: "i-lucide-share-2",
    onSelect: () => {
      modalShare.open(recipeKey);
    },
  },
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

const hasIngredientChoices = computed(() => {
  if (!recipe.value) return false;
  return (
    recipe.value.choices.ingredientItems.size > 0 ||
    recipe.value.choices.ingredientGroups.size > 0
  );
});

const addToShoppingList = async (
  scaledRecipe: Recipe,
  servings: number | undefined,
  currentChoices: RecipeChoices,
  currentVariant: string | undefined,
) => {
  if (!scaledRecipe.metadata.title || !servings) return;

  let choicesToStore: RecipeChoices | undefined = currentChoices;

  if (hasIngredientChoices.value) {
    const result = await modalChoices.open(scaledRecipe, currentVariant);
    if (!result) return; // User cancelled
    choicesToStore = result;
  }

  shoppingStore.addRecipe(
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

const editServingsInShoppingList = (
  servings: number | undefined,
  currentChoices: RecipeChoices,
) => {
  if (recipe.value?.metadata.title && servings) {
    shoppingStore.editServings(path, servings, currentChoices);
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

const { setHeaderActions } = useHeaderMenu();

if (loggedIn.value) {
  setHeaderActions(menuItems.value as DropdownMenuItem[]);
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
              v-if="loggedIn"
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
      <RecipeContent
        :recipe="recipe"
        :step-images-by-number="stepImagesByNumber"
        :editable="loggedIn"
        @delete-image="deleteImage"
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
              experimental &&
              !shoppingStore.isRecipeInSelection(path)
            "
            size="md"
            color="primary"
            label="Add to shopping list"
            icon="material-symbols:add-shopping-cart-rounded"
            @click="addToShoppingList(sr, servings, choices, selectedVariant)"
          />
          <UButton
            v-else-if="
              loggedIn &&
              experimental &&
              shoppingStore.isRecipeInSelection(path)
            "
            size="sm"
            color="secondary"
            @click="editServingsInShoppingList(servings, choices)"
            ><Icon
              class="text-lg"
              name="material-symbols:change-circle-rounded"
          /></UButton>
        </template>
      </RecipeContent>
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

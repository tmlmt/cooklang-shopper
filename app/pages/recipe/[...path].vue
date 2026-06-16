<script setup lang="ts">
import { Recipe, type RecipeChoices } from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const { $t, $ts } = useI18n();

if (!route.params.path) {
  throw createError({
    status: 404,
    statusText: $ts("errors.recipeNotFound"),
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
const { viewerCanShare, aiEnabled } = await usePublicConfig();
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
    if (res.error.value.status === 401) {
      await navigateTo("/auth", { replace: true });
    }
    throw createError({
      status: 404,
      statusText: $ts("errors.recipeNotFound"),
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
// OG Image
//---------------------------

const siteConfig = useSiteConfig();
const recipeMeta = recipe.value?.metadata as
  | Record<string, unknown>
  | undefined;
const titleMeta = recipe.value?.metadata.title || recipeName;
const descriptionMeta =
  (recipeMeta?.description as string) ||
  (recipeMeta?.introduction as string) ||
  "";
const siteBaseUrl = (siteConfig.url || "").replace(/\/$/, "");
defineOgImage(
  "RecipeOgImage",
  {
    title: titleMeta,
    description: descriptionMeta,
    coverImage: heroImages.value[0] || "",
    baseUrl: siteBaseUrl.replace(/^https?:\/\//, ""),
    canvasWidth: 1200,
    canvasHeight: 600,
  },
  [
    { key: "og" },
    {
      key: "whatsapp",
      width: 800,
      height: 800,
      props: { canvasWidth: 800, canvasHeight: 800 },
    },
  ],
);

//---------------------------
// Metadata
//---------------------------

useSeoMeta({
  title: titleMeta,
  ogTitle: titleMeta,
  description: descriptionMeta || siteConfig.description || "",
  ogDescription: descriptionMeta || siteConfig.description || "",
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
const modalShare = await useModalShareRecipe();
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
      title: $ts("toast.success"),
      description: $ts("toast.imageUploaded"),
      color: "success",
    });
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      toast.add({
        color: "error",
        title: $ts("toast.error"),
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
    $ts("actions.delete"),
    $ts("actions.cancel"),
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
      title: $ts("toast.success"),
      description: $ts("toast.imageDeleted"),
      color: "success",
    });
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      toast.add({
        color: "error",
        title: $ts("toast.error"),
        description: error.message,
      });
    }
  }
}

const recipeKey = path.replace(/\//g, ":");

const uploadImageItem: DropdownMenuItem = {
  label: $ts("actions.uploadImage"),
  icon: "i-lucide-upload",
  onSelect: openUploadModal,
};

const downloadItem: DropdownMenuItem = {
  label: $ts("actions.downloadCook"),
  icon: "i-lucide-download",
  onSelect: () => {
    if (rawRecipe.value !== undefined) {
      downloadCook(rawRecipe.value, recipeName);
    }
  },
};

const menuItems: DropdownMenuItem[] = [];

if (isEditor.value || viewerCanShare.value) {
  menuItems.push({
    label: $ts("actions.share"),
    icon: "prime:share-alt",
    onSelect: () => {
      modalShare.open(recipeKey);
    },
  });
}

if (isEditor.value) {
  menuItems.push(
    {
      label: $ts("actions.edit"),
      icon: "prime:file-edit",
      onSelect: () => {
        isEditMode.value = true;
        isManualEdit.value = true;
      },
    },
    {
      label: $ts("actions.move"),
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
            title: $ts("toast.success"),
            description: $ts("toast.recipeMoved", {
              path: `${result.dir}/${result.name}`,
            }),
            color: "success",
          });
          await navigateTo(
            `/recipe/${result.dir ? result.dir + "/" : ""}${result.name}`,
          );
        }
      },
    },
    {
      label: $ts("actions.delete"),
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
            title: $ts("toast.success"),
            description: $ts("toast.recipeDeleted"),
            color: "success",
          });

          await navigateTo("/");
        }
      },
    },
  );
}

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

// AI converter state
const aiUrl = ref("");
const aiRawText = ref("");
const isAiConverting = ref(false);
const aiStatus = ref("");
const aiCollapsibleOpen = ref(false);

const onConvertWithAi = async () => {
  let sourceText = aiRawText.value;
  isAiConverting.value = true;

  if (aiUrl.value) {
    aiStatus.value = $ts("ai.fetchingPage");
    try {
      const { text } = await $fetchWithHeaders<{ text: string }>(
        "/api/recipe/scrape",
        { method: "POST", body: { url: aiUrl.value } },
      );
      sourceText = text;
    } catch (error: unknown) {
      isAiConverting.value = false;
      aiStatus.value = "";
      toast.add({
        color: "error",
        title: $ts("ai.fetchError"),
        description:
          error instanceof FetchError
            ? error.data?.message || error.message
            : String(error),
      });
      return;
    }
  }

  if (!sourceText.trim()) {
    isAiConverting.value = false;
    toast.add({ color: "error", title: $ts("ai.noContent") });
    return;
  }

  aiStatus.value = $ts("ai.converting");
  formState.value.recipe = "";

  try {
    const response = await fetch("/api/recipe/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sourceText }),
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch {
        // ignore parse errors — use the generic HTTP status message
      }
      throw new Error(message);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentinelFound = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (!sentinelFound) {
        const idx = buffer.indexOf("\x00");
        if (idx !== -1) {
          formState.value.recipe += buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          sentinelFound = true;
        } else {
          formState.value.recipe += buffer;
          buffer = "";
        }
      }
    }
    buffer += decoder.decode();

    if (sentinelFound) {
      try {
        const usage = JSON.parse(buffer);
        toast.add({
          color: "success",
          title: $ts("toast.conversionComplete"),
          duration: 3000,
          description: $ts("toast.conversionTokens", {
            in: usage.in,
            out: usage.out,
          }),
        });
      } catch {
        toast.add({ color: "success", title: $ts("toast.conversionComplete") });
      }
      aiCollapsibleOpen.value = false;
    }
  } catch (error: unknown) {
    if (formState.value.recipe.length > 0) {
      toast.add({
        color: "warning",
        title: $ts("toast.conversionInterrupted"),
        description: $ts("toast.conversionInterruptedDetail"),
      });
    } else {
      toast.add({
        color: "error",
        title: $ts("toast.conversionFailed"),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    isAiConverting.value = false;
    aiStatus.value = "";
  }
};

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
    v.nonEmpty($ts("validation.enterRecipe")),
    v.check(isParsableRecipe, $ts("validation.invalidRecipe")),
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
        title: $ts("toast.success"),
        description: $ts("toast.recipeSaved"),
      });
      isEditMode.value = false;
      rawRecipe.value = event.data.recipe;
      recipeStore.updateRecipe(recipeName, recipeDir, event.data.recipe);
      await refreshImageManifest();
      clearRecipeCoverImageCache();
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: $ts("toast.error"),
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
        title: $ts("toast.success"),
        description: $ts("toast.recipeSaved"),
      });
      rawRecipe.value = event.data.recipe;
      recipeStore.addRecipe(recipeName, recipeDir, event.data.recipe);
      await navigateTo(`/recipe/${path}`, { replace: true });
      isEditMode.value = false;
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: $ts("toast.error"),
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
    title: $ts("toast.success"),
    description: $ts("toast.recipeAddedToList"),
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
      title: $ts("toast.success"),
      description: $ts("toast.recipeServingsModified"),
    });
  }
};

//---------------------
// Header actions
//---------------------

const {
  setHeaderActions,
  setHeaderMenuItems,
  clearHeaderActions,
  clearHeaderMenuItems,
} = useHeaderMenu();

const openCookMode = () => {
  const r = currentScaledRecipe.value ?? recipe.value;
  if (!r) return;
  modalCookMode.open(r, currentChoices.value, stepImagesByNumber.value);
};

const cookItem: DropdownMenuItem = {
  label: $ts("actions.cook"),
  icon: "i-lucide-cooking-pot",
  color: "secondary",
  variant: "soft",
  onSelect: openCookMode,
};

watch(
  isEditMode,
  () => {
    clearHeaderActions();
    clearHeaderMenuItems();
    if (loggedIn.value) {
      if (!isEditMode.value) {
        setHeaderActions([cookItem, ...menuItems]);
        setHeaderMenuItems([
          ...(isEditor.value ? [uploadImageItem] : []),
          downloadItem,
        ]);
      }
    } else {
      setHeaderActions([cookItem]);
      setHeaderMenuItems([downloadItem]);
    }
  },
  { immediate: true },
);
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
              v-slot="{ src, isLoaded, imgAttrs }"
              :custom="true"
              :src="item"
              :alt="`${recipe.metadata.title ?? recipeName}${heroImages.length > 1 ? ` image ${index + 1}` : ''}`"
              sizes="640px md:768px lg:1024px xl:1280px 2xl:1536px"
              class="max-h-112 w-full rounded-sm object-cover"
              @click="heroOverlayVisible = !heroOverlayVisible"
            >
              <!-- Show the actual image when loaded -->
              <img v-if="isLoaded" v-bind="imgAttrs" :src="src" />

              <!-- Show a placeholder while loading -->
              <USkeleton v-else class="h-112 w-full" />
            </NuxtImg>
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
          {{ recipe.metadata.title ?? $t("recipe.untitled") }}
        </h1>
        <h1 class="text-2xl font-bold md:hidden">
          {{ recipe.metadata.title ?? $t("recipe.untitled") }}
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
            :label="$ts('addToList')"
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
        <div v-if="route.query.mode === 'new' && aiEnabled" class="mb-4">
          <UCollapsible v-model:open="aiCollapsibleOpen">
            <UButton class="group" color="neutral" variant="soft" size="sm">
              <span class="flex items-center gap-2">
                <UIcon name="i-lucide-sparkles" class="size-4 shrink-0" />
                {{ $t("ai.convertFromUrl") }}
              </span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </UButton>
            <template #content>
              <UCard class="mt-2" variant="soft">
                <div class="flex flex-col gap-3">
                  <UInput
                    v-model="aiUrl"
                    placeholder="https://..."
                    :disabled="isAiConverting"
                  />
                  <UTextarea
                    v-model="aiRawText"
                    :placeholder="$ts('ai.pasteText')"
                    :rows="5"
                    :disabled="isAiConverting"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                  />
                  <p class="text-muted text-xs">
                    {{ $t("ai.urlWarning") }}
                  </p>
                  <div class="flex flex-row items-center gap-3">
                    <UButton
                      :label="$ts('actions.convertWithAi')"
                      :loading="isAiConverting"
                      :disabled="!aiUrl && !aiRawText"
                      size="sm"
                      @click="onConvertWithAi"
                    />
                    <UButton
                      :label="$ts('actions.openInCookMd')"
                      icon="i-lucide-external-link"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      :disabled="!aiUrl.startsWith('http')"
                      :to="`https://cook.md/${aiUrl}`"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                    <UChatShimmer
                      v-if="aiStatus"
                      :text="aiStatus"
                      class="text-muted text-sm"
                    />
                  </div>
                </div>
              </UCard>
            </template>
          </UCollapsible>
        </div>
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
          <UButton
            type="submit"
            :label="$ts('actions.save')"
            class="resize-y"
          />
          <UButton
            type="button"
            color="secondary"
            :label="$ts('actions.cancel')"
            @click="onEditCancel"
          />
        </div>
      </UForm>
    </div>
  </div>
</template>

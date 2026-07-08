<script setup lang="ts">
import type { NuxtError } from "#app";

type ViewMode = "grid" | "list";

const recipeStore = useRecipeStore();
const toast = useToast();
const { isEditor } = useRole();
const { $t, $ts } = useI18n();
const { $localeRoute } = useNuxtApp();
const siteConfig = useSiteConfig();

defineOgImage(
  "DefaultOgImage",
  {
    title: siteConfig.name,
    description: siteConfig.description,
  },
  [
    // Primary image for og:image and twitter:image (1200x600)
    { key: "og" },
    // Additional square image for WhatsApp (800x800)
    { key: "whatsapp", width: 800, height: 800 },
  ],
);

await callOnce("recipe-index", () => recipeStore.fetchIndex());
await callOnce("recipe-directories", () => recipeStore.fetchDirectories());

const currentPath = ref("");

const recipeCount = computed(() => recipeStore.recipeList.length);

const viewMode = useCookie<ViewMode>("ui:recipes:view-mode", {
  default: () => "grid",
  watch: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
});
watchEffect(() => {
  if (viewMode.value !== "grid" && viewMode.value !== "list") {
    viewMode.value = "grid";
  }
});

const pathItems = computed(() =>
  currentPath.value
    ? currentPath.value.split("/").map((segment, index, parts) => ({
        label: segment,
        to: $localeRoute(`/browse/${parts.slice(0, index + 1).join("/")}`),
      }))
    : [],
);

const reindexRecipes = async () => {
  await recipeStore.rebuildIndex();
  await recipeStore.fetchDirectories();
  clearRecipeCoverImageCache();
  toast.add({
    title: $ts("toast.success"),
    description: $ts("toast.recipesReindexed"),
    color: "success",
  });
};

const modalFile = await useModalFile();
const modalInput = await useModalInput();

const openNewRecipeModal = async () => {
  const result = await modalFile.open("new");
  if (result) {
    await navigateTo(
      $localeRoute(`/recipe/${pathJoin(result.dir, result.name)}?mode=new`)
        .href,
    );
  }
};

const createNewFolder = async () => {
  const name = await modalInput.open(
    $ts("actions.newFolder"),
    $ts("modal.file.name"),
    "My folder",
    $ts("actions.create"),
  );
  if (!name) return;

  try {
    const data = await $fetchWithHeaders<{ renamed: boolean; name: string }>(
      "/api/recipes/directory/subdir",
      {
        method: "POST",
        body: { parentDir: "", name },
      },
    );
    await recipeStore.fetchDirectories();
    if (!data.renamed) {
      toast.add({ title: $ts("toast.folderCreated"), color: "success" });
    } else {
      toast.add({
        title: $ts("toast.folderExistsWarning", { name }),
        description: $ts("toast.folderCreatedAs", { newName: data.name }),
        color: "warning",
      });
    }
  } catch (e) {
    toast.add({
      title: $ts("toast.folderCreationError"),
      description: (e as NuxtError).statusText,
      color: "error",
    });
  }
};

const { setHeaderMenuItems } = useHeaderMenu();

if (isEditor.value) {
  setHeaderMenuItems([
    {
      label: $ts("actions.newRecipe"),
      icon: "prime:plus",
      onSelect: openNewRecipeModal,
      mobileOnly: true,
    },
    {
      label: $ts("actions.newFolder"),
      icon: "prime:folder-plus",
      onSelect: createNewFolder,
    },
    {
      label: $ts("actions.reindexRecipes"),
      onSelect: reindexRecipes,
    },
  ]);
}

const { $tc } = useI18n();
</script>

<template>
  <div class="flex w-full flex-col gap-3 md:px-1">
    <div class="mt-4 flex w-full flex-row items-center px-4 md:mt-0 md:px-0">
      <div class="flex min-w-0 grow items-center">
        <div
          class="min-w-0 scrollbar-none overflow-x-auto pr-2 [&::-webkit-scrollbar]:hidden"
        >
          <div class="flex w-max items-center whitespace-nowrap">
            <i18n-link
              to="/"
              class="text-base md:text-lg"
              :class="
                pathItems.length === 0 ? 'font-bold' : 'text-muted font-medium'
              "
            >
              {{ $t("pages.cookbook") }}
            </i18n-link>
            <template v-for="(item, index) in pathItems" :key="item.to">
              <span class="mx-1 text-base text-muted md:text-lg">/</span>
              <i18n-link
                :to="item.to"
                class="text-base md:text-lg"
                :class="
                  index === pathItems.length - 1
                    ? 'font-bold'
                    : 'text-muted font-medium'
                "
              >
                {{ item.label }}
              </i18n-link>
            </template>
          </div>
        </div>
        <div class="ml-1 shrink-0 text-sm md:text-base">
          · {{ $tc("folder.recipes", recipeCount) }}
        </div>
      </div>
      <div class="flex flex-row">
        <UFieldGroup class="mr-2">
          <UButton
            icon="material-symbols:grid-view-outline-rounded"
            :color="viewMode === 'grid' ? 'secondary' : 'neutral'"
            :variant="viewMode === 'grid' ? 'subtle' : 'outline'"
            :active="viewMode === 'grid'"
            @click="
              () => {
                viewMode = 'grid';
              }
            "
          />
          <UButton
            icon="material-symbols:view-list-outline"
            :color="viewMode === 'list' ? 'secondary' : 'neutral'"
            :variant="viewMode === 'list' ? 'subtle' : 'outline'"
            :active="viewMode === 'list'"
            @click="
              () => {
                viewMode = 'list';
              }
            "
          />
        </UFieldGroup>

        <UButton
          v-if="isEditor"
          icon="prime:plus"
          color="primary"
          variant="soft"
          :label="$ts('actions.newRecipe')"
          class="hidden md:flex"
          @click="openNewRecipeModal"
        />
        <UButton
          v-if="isEditor"
          icon="prime:plus"
          color="primary"
          variant="soft"
          class="flex flex-none md:hidden"
          @click="openNewRecipeModal"
        />
      </div>
    </div>

    <RecipesListView
      v-if="viewMode === 'list'"
      :current-path="currentPath"
      class="px-4 md:px-0"
    />
    <RecipesGridView v-else :current-path="currentPath" class="px-4 md:px-0" />
  </div>
</template>

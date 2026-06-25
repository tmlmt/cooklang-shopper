<script setup lang="ts">
import type { NuxtError } from "#app";

const route = useRoute();

type ViewMode = "grid" | "list";

const recipeStore = useRecipeStore();
const toast = useToast();
const { isEditor } = useRole();
const { $t, $ts, $tc } = useI18n();
const { $localeRoute } = useNuxtApp();

await callOnce("recipe-index", () => recipeStore.fetchIndex());
await callOnce("recipe-directories", () => recipeStore.fetchDirectories());

const currentPath = computed(() => {
  const raw = route.params.path;
  if (Array.isArray(raw)) {
    return raw.join("/");
  }
  return typeof raw === "string" ? raw : "";
});

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
const modalConfirmation = await useModalConfirmation();
const shoppingStore = useShoppingStore();
await shoppingStore.init();

const openNewRecipeModal = async () => {
  const result = await modalFile.open("new", currentPath.value);
  if (result) {
    await navigateTo(
      $localeRoute(
        `/recipe/${pathJoin(result.dir, result.name)}?mode=new`,
      ).href,
    );
  }
};

const folderName = computed(() => currentPath.value.split("/").pop() || "");

const siteConfig = useSiteConfig();

defineOgImage(
  "DefaultOgImage",
  {
    title: siteConfig.name,
    description: $ts("description", { folder: folderName.value }),
  },
  [
    // Primary image for og:image and twitter:image (1200x600)
    { key: "og" },
    // Additional square image for WhatsApp (800x800)
    { key: "whatsapp", width: 800, height: 800 },
  ],
);

useSeoMeta({
  title: folderName.value,
  ogTitle: folderName.value,
  description: $ts("description", { folder: folderName.value }),
  ogDescription: $ts("description", { folder: folderName.value }),
});

const folderRecipeCount = computed(() => {
  const path = currentPath.value;
  return recipeStore.recipeList.filter(
    (r) => r.dir === path || r.dir.startsWith(`${path}/`),
  ).length;
});

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
        body: { parentDir: currentPath.value, name },
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

const moveFolder = async () => {
  const result = await modalFile.open(
    "move-folder",
    currentPath.value,
    folderName.value,
    [currentPath.value],
  );
  if (!result) return;

  try {
    const data = await $fetchWithHeaders<{ newPath: string }>(
      `/api/recipes/directory/${currentPath.value}`,
      {
        method: "PATCH",
        body: { destination: result.dir },
      },
    );
    // Clean up shopping store before updating recipe paths
    const affectedPaths = recipeStore.recipeList
      .filter(
        (r) =>
          r.dir === currentPath.value ||
          r.dir.startsWith(`${currentPath.value}/`),
      )
      .map((r) => (r.dir ? `${r.dir}/${r.name}` : r.name));
    affectedPaths.forEach((p) => shoppingStore.removeRecipe(p));
    // Update stores
    recipeStore.moveFolderRecipes(currentPath.value, data.newPath);
    // Refresh directories: it's a single glob call so a cheap operation
    await recipeStore.fetchDirectories();
    toast.add({ title: $ts("toast.folderMoved"), color: "success" });
    await navigateTo($localeRoute(`/browse/${data.newPath}`).href);
  } catch (e) {
    toast.add({
      title: $ts("toast.folderMovedError"),
      description: (e as NuxtError).statusText,
      color: "error",
    });
  }
};

const renameFolder = async () => {
  const newName = await modalInput.open(
    $ts("actions.rename"),
    $ts("modal.file.name"),
    folderName.value,
    $ts("actions.rename"),
    folderName.value,
  );
  if (!newName || newName === folderName.value) return;

  try {
    const data = await $fetchWithHeaders<{ newPath: string }>(
      `/api/recipes/directory/${currentPath.value}`,
      {
        method: "PUT",
        body: { name: newName },
      },
    );
    // Clean up shopping store before updating recipe paths
    const affectedPaths = recipeStore.recipeList
      .filter(
        (r) =>
          r.dir === currentPath.value ||
          r.dir.startsWith(`${currentPath.value}/`),
      )
      .map((r) => (r.dir ? `${r.dir}/${r.name}` : r.name));
    affectedPaths.forEach((p) => shoppingStore.removeRecipe(p));
    // Update stores
    recipeStore.moveFolderRecipes(currentPath.value, data.newPath);
    // Refresh directories: it's a single glob call so a cheap operation
    await recipeStore.fetchDirectories();
    toast.add({ title: $ts("toast.folderRenamed"), color: "success" });
    await navigateTo($localeRoute(`/browse/${data.newPath}`).href);
  } catch (e) {
    toast.add({
      title: $ts("toast.folderRenameError"),
      description: (e as NuxtError).statusText,
      color: "error",
    });
  }
};

const deleteFolder = async () => {
  const count = folderRecipeCount.value;
  const confirmed = await modalConfirmation.open(
    `Delete folder "${folderName.value}" and its ${count} recipe(s) and corresponding images?`,
    $ts("actions.delete"),
    $ts("actions.cancel"),
  );
  if (!confirmed) return;

  try {
    await $fetchWithHeaders(`/api/recipes/directory/${currentPath.value}`, {
      method: "DELETE",
    });
    // Update stores
    const removedPaths = recipeStore.removeFolderRecipes(currentPath.value);
    removedPaths.forEach((p) => shoppingStore.removeRecipe(p));
    // Refresh directories: it's a single glob call so a cheap operation
    await recipeStore.fetchDirectories();
    toast.add({ title: $ts("toast.folderDeleted"), color: "success" });

    // Navigate to parent folder or home
    const parentPath = currentPath.value.split("/").slice(0, -1).join("/");
    await navigateTo(
      $localeRoute(parentPath ? `/browse/${parentPath}` : "/").href,
    );
  } catch (e) {
    toast.add({
      title: $ts("toast.folderDeleteError"),
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
      label: $ts("actions.rename"),
      icon: "prime:pencil",
      onSelect: renameFolder,
    },
    {
      label: $ts("actions.move"),
      icon: "prime:arrow-right-arrow-left",
      onSelect: moveFolder,
    },
    {
      label: $ts("actions.delete"),
      icon: "prime:trash",
      onSelect: deleteFolder,
    },
    {
      label: $ts("actions.reindexRecipes"),
      onSelect: reindexRecipes,
    },
  ]);
}
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
          · {{ $tc("folder.recipes", folderRecipeCount) }}
        </div>
      </div>
      <div class="flex flex-row">
        <UFieldGroup class="mr-2">
          <UButton
            icon="material-symbols:grid-view-outline-rounded"
            :color="viewMode === 'grid' ? 'secondary' : 'neutral'"
            :variant="viewMode === 'grid' ? 'subtle' : 'outline'"
            :active="viewMode === 'grid'"
            @click="viewMode = 'grid'"
          />
          <UButton
            icon="material-symbols:view-list-outline"
            :color="viewMode === 'list' ? 'secondary' : 'neutral'"
            :variant="viewMode === 'list' ? 'subtle' : 'outline'"
            :active="viewMode === 'list'"
            @click="viewMode = 'list'"
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

<script setup lang="ts">
import type { NuxtError } from "#app";

const route = useRoute();

definePageMeta({
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

type ViewMode = "grid" | "list";

const recipeStore = useRecipeStore();
const toast = useToast();
const { isEditor } = useRole();

await callOnce("recipe-index", () => recipeStore.fetchIndex());
await callOnce("recipe-directories", () => recipeStore.fetchDirectories());

const currentPath = computed(() => {
  const raw = route.params.path;
  if (Array.isArray(raw)) {
    return raw.join("/");
  }
  return typeof raw === "string" ? raw : "";
});

const { folders, recipes } = useDirectoryContents(currentPath);

const itemCount = computed(() => folders.value.length + recipes.value.length);

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
        to: `/browse/${parts.slice(0, index + 1).join("/")}`,
      }))
    : [],
);

const reindexRecipes = async () => {
  await recipeStore.rebuildIndex();
  await recipeStore.fetchDirectories();
  clearRecipeCoverImageCache();
  toast.add({
    title: "Success",
    description: "Recipes reindexed",
    color: "success",
  });
};

const modalFile = await useModalFile();
const modalInput = await useModalInput();
const modalConfirmation = await useModalConfirmation();
const shoppingStore = useShoppingStore();
await shoppingStore.init();

const openNewRecipeModal = async () => {
  const result = await modalFile.open("new");
  if (result) {
    await navigateTo(`/recipe/${pathJoin(result.dir, result.name)}?mode=new`);
  }
};

const folderName = computed(() => currentPath.value.split("/").pop() || "");

const folderRecipeCount = computed(() => {
  const path = currentPath.value;
  return recipeStore.recipeList.filter(
    (r) => r.dir === path || r.dir.startsWith(`${path}/`),
  ).length;
});

const createNewFolder = async () => {
  const name = await modalInput.open(
    "New folder",
    "Folder name",
    "My folder",
    "Create",
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
      toast.add({ title: "Folder created", color: "success" });
    } else {
      toast.add({
        title: `A folder called '${name}' already exists`,
        description: `Folder created as '${data.name}'`,
        color: "warning",
      });
    }
  } catch (e) {
    toast.add({
      title: "Error creating folder",
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
    toast.add({ title: "Folder moved", color: "success" });
    await navigateTo(`/browse/${data.newPath}`);
  } catch (e) {
    toast.add({
      title: "Error moving folder",
      description: (e as NuxtError).statusText,
      color: "error",
    });
  }
};

const renameFolder = async () => {
  const newName = await modalInput.open(
    "Rename folder",
    "New name",
    folderName.value,
    "Rename",
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
    toast.add({ title: "Folder renamed", color: "success" });
    await navigateTo(`/browse/${data.newPath}`);
  } catch (e) {
    toast.add({
      title: "Error renaming folder",
      description: (e as NuxtError).statusText,
      color: "error",
    });
  }
};

const deleteFolder = async () => {
  const count = folderRecipeCount.value;
  const confirmed = await modalConfirmation.open(
    `Delete folder "${folderName.value}" and its ${count} recipe(s) and corresponding images?`,
    "Delete",
    "Cancel",
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
    toast.add({ title: "Folder deleted", color: "success" });

    // Navigate to parent folder or home
    const parentPath = currentPath.value.split("/").slice(0, -1).join("/");
    await navigateTo(parentPath ? `/browse/${parentPath}` : "/");
  } catch (e) {
    toast.add({
      title: "Error deleting folder",
      description: (e as NuxtError).statusText,
      color: "error",
    });
  }
};

const { setHeaderMenuItems } = useHeaderMenu();

if (isEditor.value) {
  setHeaderMenuItems([
    {
      label: "New recipe",
      icon: "prime:plus",
      onSelect: openNewRecipeModal,
      mobileOnly: true,
    },
    {
      label: "New folder",
      icon: "prime:folder-plus",
      onSelect: createNewFolder,
    },
    {
      label: "Rename folder",
      icon: "prime:pencil",
      onSelect: renameFolder,
    },
    {
      label: "Move folder",
      icon: "prime:arrow-right-arrow-left",
      onSelect: moveFolder,
    },
    {
      label: "Delete folder",
      icon: "prime:trash",
      onSelect: deleteFolder,
    },
    {
      label: "Re-index recipes",
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
          class="min-w-0 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div class="flex w-max items-center whitespace-nowrap">
            <NuxtLink
              to="/"
              class="text-base md:text-lg"
              :class="
                pathItems.length === 0 ? 'font-bold' : 'text-muted font-medium'
              "
            >
              Cookbook
            </NuxtLink>
            <template v-for="(item, index) in pathItems" :key="item.to">
              <span class="text-muted mx-1 text-base md:text-lg">/</span>
              <NuxtLink
                :to="item.to"
                class="text-base md:text-lg"
                :class="
                  index === pathItems.length - 1
                    ? 'font-bold'
                    : 'text-muted font-medium'
                "
              >
                {{ item.label }}
              </NuxtLink>
            </template>
          </div>
        </div>
        <div class="ml-1 shrink-0 text-sm md:text-base">
          · {{ itemCount }} items
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
          label="New Recipe"
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

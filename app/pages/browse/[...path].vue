<script setup lang="ts">
const route = useRoute();

definePageMeta({
  title: "Cooklang Shopper",
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

type ViewMode = "grid" | "list";

const recipeStore = useRecipeStore();
const toast = useToast();

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
  default: () => "list",
  watch: true,
});
watchEffect(() => {
  if (viewMode.value !== "grid" && viewMode.value !== "list") {
    viewMode.value = "list";
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
  toast.add({
    title: "Success",
    description: "Recipes reindexed",
    color: "success",
    duration: 3000,
  });
};

const modalFile = await useModalFile();

const openNewRecipeModal = async () => {
  const result = await modalFile.open("new");
  if (result) {
    await navigateTo(`/recipe/${pathJoin(result.dir, result.name)}?mode=new`);
  }
};

const { setHeaderMenuItems, clearHeaderMenuItems } = useHeaderMenu();

setHeaderMenuItems([
  {
    label: "New recipe",
    icon: "prime:plus",
    onSelect: openNewRecipeModal,
    mobileOnly: true,
  },
  {
    label: "Re-index recipes",
    onSelect: reindexRecipes,
  },
]);

onBeforeRouteLeave(() => {
  clearHeaderMenuItems();
});
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
          icon="prime:plus"
          color="primary"
          variant="soft"
          label="New Recipe"
          class="hidden md:flex"
          @click="openNewRecipeModal"
        />
        <UButton
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

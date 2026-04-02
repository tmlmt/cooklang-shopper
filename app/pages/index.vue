<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from "@nuxt/ui";
import type { RecipeEssentials } from "~~/shared/types";

definePageMeta({
  title: "Cooklang Shopper",
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

const toast = useToast();

//------------------------
// Retrieving recipe list
//------------------------

const recipeStore = useRecipeStore();
await callOnce("recipe-index", () => recipeStore.fetchIndex());

//--------------------
// Menu
//--------------------

const reindexRecipes = async () => {
  await recipeStore.rebuildIndex();
  toast.add({
    title: "Success",
    description: "Recipes reindexed",
    color: "success",
    duration: 3000,
  });
};

//--------------------
// Selection
//--------------------

type RowSelectionState = Record<string, boolean>;

const shoppingStore = useShoppingStore();
const initialSelectedRows: RowSelectionState = {};

shoppingStore.recipeSelection.forEach((recipe) => {
  const index = recipeStore.recipeList.findIndex((r) =>
    r.dir === ""
      ? r.name === recipe.path
      : [r.dir, r.name].join("/") === recipe.path,
  );
  if (index !== -1) {
    initialSelectedRows[String(index)] = true;
  }
});
const selectedRows = ref<RowSelectionState>(initialSelectedRows);

const diffRowSelection = (
  oldState: RowSelectionState,
  newState: RowSelectionState,
): { added: string[]; removed: string[] } => {
  const oldKeys = Object.keys(oldState).filter((k) => oldState[k]);
  const newKeys = Object.keys(newState).filter((k) => newState[k]);

  const added = newKeys.filter((k) => !oldKeys.includes(k));
  const removed = oldKeys.filter((k) => !newKeys.includes(k));

  return { added, removed };
};

//----------------------
// Columns
//----------------------

const ULink = resolveComponent("ULink");
const UCheckbox = resolveComponent("UCheckbox");
const UButton = resolveComponent("UButton");
const { experimental } = usePublicConfig();

const selectColumn: TableColumn<RecipeEssentials> = {
  id: "select",
  header: ({ table }) =>
    h(UCheckbox, {
      modelValue: table.getIsSomePageRowsSelected()
        ? "indeterminate"
        : table.getIsAllPageRowsSelected(),
      "onUpdate:modelValue": (value: boolean | "indeterminate") =>
        table.toggleAllPageRowsSelected(!!value),
      "aria-label": "Select all",
    }),
  cell: ({ row }) =>
    h(UCheckbox, {
      modelValue: row.getIsSelected(),
      "onUpdate:modelValue": (value: boolean | "indeterminate") =>
        row.toggleSelected(!!value),
      "aria-label": "Select row",
    }),
};

const columns = computed<TableColumn<RecipeEssentials>[]>(() => [
  ...(experimental.value ? [selectColumn] : []),
  {
    accessorKey: "title",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Title",
        icon: isSorted
          ? isSorted === "asc"
            ? "prime:sort-alpha-down"
            : "prime:sort-alpha-up"
          : "prime:sort-alt",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        ULink,
        {
          to: {
            path: `/recipe/${row.getValue("dir") ? row.getValue("dir") + "/" : ""}${row.original.name}`,
          },
        },
        () => row.getValue("title"),
      );
    },
  },
  {
    accessorKey: "dir",
    header: "Directory",
    cell: ({ row }) => `/${row.getValue("dir")}`,
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = (row.getValue("tags") as Array<string>).join(", ");
      return tags || "-";
    },
    enableColumnFilter: true,
    filterFn: "arrIncludes",
  },
  {
    id: "action",
    header: () => h("div", { class: "text-center" }, "Actions"),
  },
]);

const modal = await useModalConfirmation();

function getDropdownActions(recipe: RecipeEssentials): DropdownMenuItem[][] {
  return [
    [
      {
        label: "View",
        icon: "prime:eye",
        onClick: async () => {
          await navigateTo(
            `/recipe/${recipe.dir ? recipe.dir + "/" : ""}${recipe.name}`,
          );
        },
      },
      {
        label: "Edit",
        icon: "prime:file-edit",
        onClick: async () => {
          await navigateTo(
            `/recipe/${recipe.dir ? recipe.dir + "/" : ""}${recipe.name}?mode=edit`,
          );
        },
      },
      {
        label: "Delete",
        icon: "prime:trash",
        color: "error",
        onClick: async () => {
          const result = await modal.open(
            "Are you sure you want to delete this recipe?",
          );
          if (result) {
            // Delete recipe from server
            await $fetchWithHeaders(
              `/api/recipe/${recipe.dir ? recipe.dir + "/" : ""}${recipe.name}`,
              { method: "DELETE" },
            );

            // Remove from store index
            recipeStore.removeRecipe(recipe.name, recipe.dir);

            // Remove from selected list (if present)
            shoppingStore.removeRecipe(
              recipe.dir ? recipe.dir + "/" + recipe.name : recipe.name,
            );

            // Show success toast
            toast.add({
              title: "Success",
              description: "Recipe deleted",
              color: "success",
            });
          }
        },
      },
    ],
  ];
}

//--------------------
// Shopping List
//--------------------

watch(selectedRows, (newSelected, oldSelected) => {
  const changedIndexes = diffRowSelection(oldSelected, newSelected);

  for (const index of changedIndexes.added) {
    const recipe = recipeStore.recipeList[parseInt(index)];
    if (recipe) {
      const recipePath =
        recipe.dir === "" ? recipe.name : [recipe.dir, recipe.name].join("/");
      shoppingStore.addRecipe(recipe.title, recipePath, recipe.servings);
    }
  }
  for (const index of changedIndexes.removed) {
    const recipe = recipeStore.recipeList[parseInt(index)];
    if (recipe) {
      const recipePath =
        recipe.dir === "" ? recipe.name : [recipe.dir, recipe.name].join("/");
      shoppingStore.removeRecipe(recipePath);
    }
  }
});

//---------------------
// New Recipe
//---------------------

const modalFile = await useModalFile();

const openNewRecipeModal = async () => {
  const result = await modalFile.open("new");
  if (result) {
    await navigateTo(`/recipe/${pathJoin(result.dir, result.name)}?mode=new`);
  }
};

//---------------------
// Header menu (mobile)
//---------------------

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
  <div class="flex w-full flex-col gap-2 md:px-1">
    <div class="mt-4 flex w-full flex-row items-center px-4 md:mt-0 md:px-0">
      <div class="flex grow items-center">
        <div class="mr-1 text-sm font-bold md:text-lg">Cookbook</div>
        <div class="text-xs md:text-base">
          ·
          {{ recipeStore.recipeList.length }} items
        </div>
      </div>
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
    <UTable
      ref="table"
      v-model:row-selection="selectedRows"
      :data="recipeStore.recipeList"
      :columns="columns"
      :ui="{ td: 'px-4 py-2 md:py-4' }"
    >
      <template #action-cell="{ row }">
        <div class="text-center">
          <UDropdownMenu :items="getDropdownActions(row.original)">
            <UButton
              icon="prime:ellipsis-v"
              color="neutral"
              variant="ghost"
              aria-label="Actions"
            />
          </UDropdownMenu>
        </div>
      </template>
    </UTable>
  </div>
</template>

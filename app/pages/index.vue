<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from "@nuxt/ui";
import type { RecipeIndex, RecipeEssentials } from "~~/types";

definePageMeta({
  title: "Cooklang Shopper",
  description: "Weekly meal planner, from recipes to shopping cart",
});

const toast = useToast();

//------------------------
// Retrieving recipe list
//------------------------

const res = await useFetch("/api/recipes");
const recipesIndex = ref<{ recipes: RecipeIndex }>();

if (res.data.value) {
  recipesIndex.value = res.data.value;
}

const allRecipesList = computed(() => {
  if (recipesIndex.value && recipesIndex.value.recipes) {
    return Object.values(recipesIndex.value.recipes);
  }
  return undefined;
});

//--------------------
// Menu
//--------------------

const reindexRecipes = async () => {
  const newIndex = await $fetch("/api/recipes/rebuild-index");
  if (newIndex) {
    recipesIndex.value = newIndex;
    toast.add({
      title: "Success",
      description: "Recipes reindexed",
      color: "success",
      duration: 3000,
    });
  }
};

const items = ref<DropdownMenuItem[]>([
  {
    label: "Re-index recipes",
    onSelect: reindexRecipes,
  },
]);

//--------------------
// Selection
//--------------------

type RowSelectionState = Record<string, boolean>;

const shoppingStore = useShoppingStore();
const initialSelectedRows: RowSelectionState = {};

shoppingStore.recipeSelection.forEach((recipe) => {
  const index = allRecipesList.value?.findIndex((r) =>
    r.dir === ""
      ? r.name === recipe.path
      : [r.dir, r.name].join("/") === recipe.path,
  );
  if (index !== undefined && index !== -1) {
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

const columns: TableColumn<RecipeEssentials>[] = [
  {
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
  },
  {
    accessorKey: "title",
    header: "Title",
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
    cell: ({ row }) => row.getValue("dir"),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (row.getValue("tags") as Array<string>).join(", "),
    enableColumnFilter: true,
    filterFn: "arrIncludes",
  },
  {
    id: "action",
    header: "Actions",
  },
];

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
            // Delete recipe and remove from index
            const newIndex = await $fetch(
              `/api/recipe/${recipe.dir ? recipe.dir + "/" : ""}${recipe.name}`,
              { method: "DELETE" },
            );
            if (newIndex) {
              recipesIndex.value = newIndex;
            }

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
  if (!allRecipesList.value) return;

  const changedIndexes = diffRowSelection(oldSelected, newSelected);

  for (const index of changedIndexes.added) {
    const recipe = allRecipesList.value[parseInt(index)];
    if (recipe) {
      const recipePath =
        recipe.dir === "" ? recipe.name : [recipe.dir, recipe.name].join("/");
      shoppingStore.addRecipe(recipe.title, recipePath, recipe.servings);
    }
  }
  for (const index of changedIndexes.removed) {
    const recipe = allRecipesList.value[parseInt(index)];
    if (recipe) {
      const recipePath =
        recipe.dir === "" ? recipe.name : [recipe.dir, recipe.name].join("/");
      shoppingStore.removeRecipe(recipePath);
    }
  }
});
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="flex flex-row gap-4">
      <h1 class="text-3xl">Recipes</h1>
      <UDropdownMenu :items="items" :content="{ align: 'start' }">
        <UButton
          icon="prime:bars"
          size="lg"
          color="secondary"
          variant="outline"
        />
      </UDropdownMenu>
    </div>
    <UTable
      ref="table"
      v-model:row-selection="selectedRows"
      :data="allRecipesList"
      :columns="columns"
    >
      <template #action-cell="{ row }">
        <UDropdownMenu :items="getDropdownActions(row.original)">
          <UButton
            icon="prime:ellipsis-v"
            color="neutral"
            variant="ghost"
            aria-label="Actions"
          />
        </UDropdownMenu>
      </template>
    </UTable>
  </div>
</template>

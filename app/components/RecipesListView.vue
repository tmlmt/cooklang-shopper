<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui";
import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeEssentials } from "~~/shared/types";
import RecipeTagOverflow from "~~/app/components/recipe/TagOverflow.vue";

type RowSelectionState = Record<string, boolean>;

const props = defineProps<{
  currentPath: string;
}>();

const recipeStore = useRecipeStore();
const shoppingStore = useShoppingStore();
await shoppingStore.init();
const modalChoices = await useModalChoices();
const toast = useToast();
const { shoppingEnabled } = await useShoppingEnabled();

const currentPathRef = toRef(props, "currentPath");
const { folders, recipes } = useDirectoryContents(currentPathRef);

const selectedRows = ref<RowSelectionState>({});

const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const ULink = resolveComponent("ULink");

const recipePath = (recipe: RecipeEssentials) =>
  recipe.dir ? `${recipe.dir}/${recipe.name}` : recipe.name;

const preferredTime = (recipe: RecipeEssentials) => {
  const times = recipe.times;
  if (!times) return "-";
  const value = times.total ?? times.cook ?? times.prep;
  if (value === undefined) return "-";
  return formatTime(value);
};

const formatModified = (recipe: RecipeEssentials) => {
  if (!recipe.lastModified) return "-";
  const date = new Date(recipe.lastModified);
  if (Number.isNaN(date.getTime())) return "-";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

const buildSelectionState = () => {
  const next: RowSelectionState = {};

  recipes.value.forEach((recipe, index) => {
    if (shoppingStore.isRecipeInSelection(recipePath(recipe))) {
      next[String(index)] = true;
    }
  });

  return next;
};

watch(
  [recipes, () => shoppingStore.recipeSelection.length],
  () => {
    selectedRows.value = buildSelectionState();
  },
  { immediate: true },
);

const diffRowSelection = (
  oldState: RowSelectionState,
  newState: RowSelectionState,
): { added: string[]; removed: string[] } => {
  const oldKeys = Object.keys(oldState).filter((key) => oldState[key]);
  const newKeys = Object.keys(newState).filter((key) => newState[key]);

  return {
    added: newKeys.filter((key) => !oldKeys.includes(key)),
    removed: oldKeys.filter((key) => !newKeys.includes(key)),
  };
};

watch(selectedRows, async (newSelected, oldSelected) => {
  const changed = diffRowSelection(oldSelected, newSelected);

  for (const index of changed.added) {
    const recipe = recipes.value[Number.parseInt(index, 10)];
    if (!recipe) continue;
    const path = recipePath(recipe);
    if (shoppingStore.isRecipeInSelection(path)) continue;

    const raw = await $fetchWithHeaders<string>(`/api/recipe/${path}`);
    const recipeObj = new Recipe(raw);
    const choicesForDefaultVariant = recipeObj.getChoicesForVariant();
    const hasChoices =
      choicesForDefaultVariant.ingredientItems.size > 0 ||
      choicesForDefaultVariant.ingredientGroups.size > 0;

    let choices;
    if (hasChoices) {
      choices = await modalChoices.open(recipeObj);
      if (!choices) {
        selectedRows.value = { ...selectedRows.value, [index]: false };
        continue;
      }
    }

    await shoppingStore.addRecipe(recipe.title, path, recipe.servings, choices);
  }

  for (const index of changed.removed) {
    const recipe = recipes.value[Number.parseInt(index, 10)];
    if (!recipe) continue;
    shoppingStore.removeRecipe(recipePath(recipe));
  }
});

const folderColumns: TableColumn<FolderInfo>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Folder",
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
            path: `/browse/${row.original.path}`,
          },
          class: "font-medium",
        },
        () => row.original.name,
      );
    },
  },
  {
    accessorKey: "subdirCount",
    header: "Subfolders",
  },
  {
    accessorKey: "recipeCount",
    header: "Recipes",
  },
];

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

const recipeColumns = computed<TableColumn<RecipeEssentials>[]>(() => [
  ...(shoppingEnabled.value ? [selectColumn] : []),
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
            path: row.original.dir
              ? `/recipe/${row.original.dir}/${row.original.name}`
              : `/recipe/${row.original.name}`,
          },
        },
        () => row.original.title,
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) =>
      h(RecipeTagOverflow, {
        tags: row.original.tags,
        mode: "list",
      }),
  },
  {
    id: "time",
    header: "Time",
    cell: ({ row }) => preferredTime(row.original),
  },
  {
    id: "modified",
    header: "Modified",
    cell: ({ row }) => formatModified(row.original),
  },
  {
    accessorKey: "servings",
    header: "Yield",
  },
  {
    id: "author",
    header: "Author",
    cell: ({ row }) => row.original.author || "-",
  },
  {
    id: "source",
    header: "Source",
    cell: ({ row }) => row.original.source || "-",
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
            recipe.dir
              ? `/recipe/${recipe.dir}/${recipe.name}`
              : `/recipe/${recipe.name}`,
          );
        },
      },
      {
        label: "Edit",
        icon: "prime:file-edit",
        onClick: async () => {
          await navigateTo(
            recipe.dir
              ? `/recipe/${recipe.dir}/${recipe.name}?mode=edit`
              : `/recipe/${recipe.name}?mode=edit`,
          );
        },
      },
      {
        label: "Delete",
        icon: "prime:trash",
        color: "error",
        onClick: async () => {
          const confirmed = await modal.open(
            "Are you sure you want to delete this recipe?",
          );
          if (!confirmed) return;

          await $fetchWithHeaders(
            recipe.dir
              ? `/api/recipe/${recipe.dir}/${recipe.name}`
              : `/api/recipe/${recipe.name}`,
            { method: "DELETE" },
          );

          recipeStore.removeRecipe(recipe.name, recipe.dir);
          shoppingStore.removeRecipe(recipePath(recipe));

          toast.add({
            title: "Success",
            description: "Recipe deleted",
            color: "success",
          });
        },
      },
    ],
  ];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UTable
      v-if="folders.length > 0"
      :data="folders"
      :columns="folderColumns"
      :ui="{ td: 'px-4 py-2 md:py-3' }"
    />

    <UTable
      v-if="recipes.length > 0"
      v-model:row-selection="selectedRows"
      :data="recipes"
      :columns="recipeColumns"
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

    <UAlert
      v-if="folders.length === 0 && recipes.length === 0"
      color="neutral"
      variant="subtle"
      title="Nothing here yet"
      description="Create a recipe or add a subfolder to get started."
    />
  </div>
</template>

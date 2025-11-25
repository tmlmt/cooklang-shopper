<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { RecipeInfo } from "~~/types";

definePageMeta({
  title: "Cook Lister - Shopping List",
  description: "Weekly meal planner, from recipes to shopping cart",
});

const shoppingStore = useShoppingStore();
const shoppingList = await useShoppingList();
const ingredients = shoppingList.ingredients;
const toast = useToast();

const UButton = resolveComponent("UButton");
const ULink = resolveComponent("ULink");

const columns: TableColumn<RecipeInfo>[] = [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "title",
    header: "Name",
    cell: ({ row }) => {
      return h(
        ULink,
        {
          to: {
            path: `/recipe/${row.original.path}`,
          },
        },
        () => row.getValue("title"),
      );
    },
  },
  {
    accessorKey: "servings",
    header: "Servings",
    cell: ({ row }) => row.getValue("servings"),
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return h(UButton, {
        icon: "prime:trash",
        color: "error",
        onClick: () => {
          shoppingStore.removeRecipe(row.original.path);
          toast.add({
            color: "success",
            title: "Success",
            description: "Recipe successfully removed from shopping list",
            duration: 3000,
          });
        },
      });
    },
  },
];
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <h1 class="text-3xl">Shopping List</h1>
    <UTable :data="shoppingStore.recipeSelection" :columns="columns" />
    <div v-if="ingredients && ingredients.length > 0">
      <h2 class="mb-4 text-3xl">Ingredients</h2>
      <IngredientList :ingredients="ingredients" />
    </div>
  </div>
</template>

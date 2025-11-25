<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { ProductMisMatch, ProductSelection } from "@tmlmt/cooklang-parser";
import getQuantityValue from "~/utils/getQuantityValue";

definePageMeta({
  title: "Cook Lister - Shopping List",
  description: "Weekly meal planner, from recipes to shopping cart",
});

const { cart, misMatch } = await useShoppingCart();

const columnsCart: TableColumn<ProductSelection>[] = [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "productName",
    header: "Product Name",
    cell: ({ row }) => row.original.product.productName,
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => row.getValue("quantity"),
  },
];

const columnsMisMatch: TableColumn<ProductMisMatch>[] = [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "ingredientName",
    header: "Ingredient Name",
    cell: ({ row }) => row.original.ingredient.name,
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      if (!row.original.ingredient.quantity) {
        return "-";
      } else {
        let quantityString = getQuantityValue(row.original.ingredient.quantity);
        if (row.original.ingredient.unit) {
          quantityString += ` ${row.original.ingredient.unit}`;
        }
        return quantityString;
      }
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => misMatchReasonToText(row.original.reason),
  },
];
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <h1 class="text-3xl">Shopping Cart</h1>
    <UTable :data="cart" :columns="columnsCart" />
    <h2 class="text-2xl">Ingredients without corresponding products</h2>
    <UTable :data="misMatch" :columns="columnsMisMatch" />
  </div>
</template>

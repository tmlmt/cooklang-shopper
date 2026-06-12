<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import {
  formatQuantityWithUnit,
  type ProductMisMatch,
  type ProductSelection,
} from "@tmlmt/cooklang-parser";

definePageMeta({
  title: "Shopping Cart",
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

const { cart, misMatch } = await useShoppingCart();
const { $t } = useI18n();

const columnsCart: TableColumn<ProductSelection>[] = [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "productName",
    header: () => $t("columnProduct"),
    cell: ({ row }) => row.original.product.productName,
  },
  {
    accessorKey: "quantity",
    header: () => $t("columnQuantity"),
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
    header: () => $t("columnIngredient"),
    cell: ({ row }) => row.original.ingredient.name,
  },
  {
    accessorKey: "quantity",
    header: () => $t("columnQuantity"),
    cell: ({ row }) => {
      const quantities = row.original.ingredient.quantities;
      if (!quantities?.length) {
        return "-";
      }
      return quantities
        .map((q) => {
          if ("and" in q) {
            return q.and
              .map((a) => formatQuantityWithUnit(a.quantity, a.unit))
              .join(" + ");
          }
          return formatQuantityWithUnit(q.quantity, q.unit);
        })
        .join(", ");
    },
  },
  {
    accessorKey: "reason",
    header: () => $t("columnReason"),
    cell: ({ row }) => misMatchReasonToText(row.original.reason),
  },
];
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <h1 class="text-3xl">{{ $t('pages.shoppingCart') }}</h1>
    <UTable :data="cart" :columns="columnsCart" />
    <h2 class="text-2xl">{{ $t('noMatchingProducts') }}</h2>
    <UTable :data="misMatch" :columns="columnsMisMatch" />
  </div>
</template>

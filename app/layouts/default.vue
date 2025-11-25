<script setup lang="ts">
import type { BreadcrumbItem } from "@nuxt/ui";

const route = useRoute();

const items = computed<BreadcrumbItem[]>(() => [
  { label: "Recipes", to: "/", active: route.path === "/" },
  {
    label: "Shopping List",
    to: "/list",
    active: route.path === "/list",
  },
  {
    label: "Shopping Cart",
    to: "/cart",
    active: route.path === "/cart",
  },
]);

useSeoMeta({
  author: "Thomas Lamant",
  title: (route.meta.title as string) || "Cook Lister",
  ogTitle: (route.meta.title as string) || "Cook Lister",
  description:
    (route.meta.description as string) ||
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
  ogDescription:
    (route.meta.description as string) ||
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});
</script>

<template>
  <div class="absolute flex h-full w-full flex-col">
    <UHeader>
      <template #title> Cooklang Shopper </template>
      <UBreadcrumb :items="items" />
      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>
    <UContainer class="mt-0 flex w-full flex-auto px-4 md:mt-5">
      <main class="flex w-full">
        <slot />
      </main>
    </UContainer>
  </div>
</template>

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

const navRight = computed(() => {
  if (route.path === "/") {
    return { text: "Continue to shopping list", to: "/list" };
  } else if (route.path === "/list") {
    return { text: "Continue to shopping cart", to: "/cart" };
  } else {
    return undefined;
  }
});

const navLeft = computed(() => {
  if (route.path === "/list" || route.path.startsWith("/recipe/")) {
    return { text: "Back to recipes", to: "/" };
  } else if (route.path === "/cart") {
    return { text: "Back to shopping list", to: "/list" };
  } else {
    return undefined;
  }
});
</script>

<template>
  <div class="absolute flex h-full w-full flex-col">
    <UHeader class="min-h-16">
      <template #title> Cooklang Shopper </template>
      <UBreadcrumb :ui="{ root: 'mt-1', link: 'text-md' }" :items="items" />
      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>
    <UContainer class="mt-0 flex w-full flex-auto px-4 md:mt-5">
      <main class="flex w-full">
        <slot />
      </main>
    </UContainer>
    <USeparator class="h-px" />
    <UFooter>
      <template v-if="navLeft" #left>
        <UCard class="hover:bg-elevated" @click="navigateTo(navLeft.to)">
          <UButton
            class="rounded-full"
            variant="outline"
            color="neutral"
            icon="prime:arrow-left"
          />
          <p class="text-md mt-2">{{ navLeft.text }}</p>
        </UCard>
      </template>
      <template v-if="navRight" #right>
        <UCard class="group hover:bg-elevated" @click="navigateTo(navRight.to)">
          <UButton
            class="group-hover:bg-elevated rounded-full"
            variant="outline"
            color="neutral"
            icon="prime:arrow-right"
          />
          <p class="text-md mt-2">{{ navRight.text }}</p>
        </UCard>
      </template>
    </UFooter>
  </div>
</template>

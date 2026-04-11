<script setup lang="ts">
import type {
  BreadcrumbItem,
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

const route = useRoute();
const { experimental, title: appTitle } = usePublicConfig();

//---------------
// Header menus
//---------------

const permanentMenuItems: DropdownMenuItem[] = [
  {
    label: "Authentication",
    icon: "material-symbols:fingerprint",
    onSelect: () => navigateTo("/auth"),
  },
  {
    label: "Toggle color mode",
    icon: "material-symbols:dark-mode",
    onSelect: () => {
      colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
    },
  },
];

const { mobileHeaderMenuItems, desktopHeaderMenuItems, headerActionItems } =
  useHeaderMenu();
(mobileHeaderMenuItems.value as DropdownMenuItem[]).push(...permanentMenuItems);

const isRecipePage = computed(() => route.path.startsWith("/recipe/"));

const headerOpen = ref(false);

const wrappedMobileHeaderMenuItems = computed(() =>
  (mobileHeaderMenuItems.value as DropdownMenuItem[]).map((item) => ({
    ...item,
    onSelect: (e: Event) => {
      item.onSelect?.(e);
      // Close the header menu after selecting an item
      headerOpen.value = false;
    },
  })),
);

const navigationItems = computed<BreadcrumbItem[]>(() => [
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

const modal = await useModalAbout();

const aboutItems = computed<DropdownMenuItem[]>(() => [
  { label: "About", onSelect: async () => await modal.open() },
]);

const colorMode = useColorMode();

const dropDownMenuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = [
    ...(desktopHeaderMenuItems.value as DropdownMenuItem[]),
  ];
  if (isRecipePage.value) {
    items.push(...permanentMenuItems);
  }
  if (items.length > 0) items.push({ type: "separator" });
  items.push(...aboutItems.value);
  return items;
});

//----------------
// SEO
//----------------

useSeoMeta({
  author: "Thomas Lamant",
  title: (route.meta.title as string)
    ? `${appTitle.value} - ${route.meta.title}`
    : appTitle.value,
  ogTitle: (route.meta.title as string)
    ? `${appTitle.value} - ${route.meta.title}`
    : appTitle.value,
  description:
    (route.meta.description as string) ||
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
  ogDescription:
    (route.meta.description as string) ||
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

//---------------
// Footer
//---------------

const navRight = computed(() => {
  if (!experimental.value) return undefined;
  if (route.path === "/") {
    return { text: "Continue to shopping list", to: "/list" };
  } else if (route.path === "/list") {
    return { text: "Continue to shopping cart", to: "/cart" };
  } else {
    return undefined;
  }
});

const router = useRouter();

const goBack = () => router.back();

const navLeft = computed(() => {
  if (route.path.startsWith("/recipe/")) {
    return { text: "Back to recipes", action: goBack };
  }
  if (!experimental.value) return undefined;
  if (route.path === "/list") {
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
    <UHeader
      v-model:open="headerOpen"
      class="min-h-16"
      :ui="{
        title: 'items-center gap-3',
        left: 'min-w-0',
        right: 'shrink-0',
      }"
    >
      <template #left>
        <UButton
          v-if="route.path.startsWith('/recipe/')"
          icon="material-symbols:undo"
          size="lg"
          variant="ghost"
          color="neutral"
          label="Back"
          @click.stop="goBack"
        />
        <ULink
          v-else
          to="/"
          class="focus-visible:outline-primary hover:text-default text-highlighted flex min-w-0 flex-row items-center gap-2 text-xl font-bold transition-colors"
        >
          <Icon
            name="material-symbols:chef-hat-rounded"
            size="1.2em"
            class="shrink-0"
          />
          <span class="truncate">{{ appTitle }}</span>
        </ULink>
      </template>
      <UBreadcrumb
        v-if="experimental"
        :ui="{ root: 'mt-1', link: 'text-md' }"
        :items="navigationItems"
      />
      <template #body>
        <UNavigationMenu
          v-if="experimental"
          :ui="{ root: 'mt-1', link: 'text-md' }"
          :items="navigationItems as NavigationMenuItem[]"
          orientation="vertical"
          class="-mx-2.5"
        />
        <USeparator
          v-if="experimental && mobileHeaderMenuItems.length > 0"
          class="my-2"
        />
        <UNavigationMenu
          v-if="mobileHeaderMenuItems.length > 0"
          :ui="{ root: 'mt-1', link: 'text-md' }"
          :items="wrappedMobileHeaderMenuItems as NavigationMenuItem[]"
          orientation="vertical"
          class="-mx-2.5"
        />
        <USeparator
          v-if="mobileHeaderMenuItems.length > 0 || isRecipePage"
          class="my-2"
        />
        <UNavigationMenu
          :ui="{ root: 'mt-1', link: 'text-md' }"
          :items="aboutItems as NavigationMenuItem[]"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
      <template #right>
        <template v-if="isRecipePage">
          <UButton
            v-for="action in headerActionItems"
            :key="`action-${action.label}`"
            :label="action.label"
            :icon="action.icon"
            variant="ghost"
            :color="(action.color as any) ?? 'neutral'"
            :ui="{ label: 'hidden md:flex ' }"
            @click="action.onSelect?.($event)"
          />
        </template>
        <template v-else>
          <UButton
            v-if="route.path !== '/auth'"
            variant="ghost"
            color="neutral"
            icon="material-symbols:fingerprint"
            to="/auth"
          />
          <UColorModeButton />
        </template>
        <UDropdownMenu :items="dropDownMenuItems" :content="{ align: 'end' }">
          <UButton
            icon="prime:bars"
            size="xl"
            color="neutral"
            variant="ghost"
            class="hidden md:flex"
          />
        </UDropdownMenu>
      </template>
    </UHeader>
    <UContainer
      class="mt-0 flex w-full flex-auto md:mt-5"
      :ui="{ base: 'px-0' }"
    >
      <main class="flex w-full">
        <slot />
      </main>
    </UContainer>
    <USeparator class="mt-4 h-px" />
    <UFooter v-if="navLeft || navRight">
      <template v-if="navLeft" #left>
        <UCard
          class="hover:bg-elevated cursor-pointer"
          @click="navLeft.action ? navLeft.action() : navigateTo(navLeft.to!)"
        >
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
        <UCard
          class="group hover:bg-elevated cursor-pointer"
          @click="navigateTo(navRight.to)"
        >
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

<script setup lang="ts">
import type {
  BreadcrumbItem,
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

const route = useRoute();
const { experimental, title: appTitle, sharing } = await usePublicConfig();
const { hasInAppHistory } = usePreviousRoute();
const { loggedIn } = useUserSession();

//---------------
// Header menus
//---------------

const authMenuItem = computed<DropdownMenuItem>(() =>
  loggedIn.value
    ? {
        label: "Authentication",
        icon: "mdi:user",
        onSelect: () => navigateTo("/auth"),
      }
    : {
        label: "Sign in",
        icon: "material-symbols:login",
        onSelect: () => navigateTo("/auth"),
      },
);

const permanentMenuItems = computed<DropdownMenuItem[]>(() => [
  authMenuItem.value,
  {
    label: "Toggle color mode",
    icon: "material-symbols:dark-mode",
    onSelect: () => {
      colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
    },
  },
]);

const { mobileHeaderMenuItems, desktopHeaderMenuItems, headerActionItems } =
  useHeaderMenu();

const isRecipePage = computed(() => route.path.startsWith("/recipe/"));

const headerOpen = ref(false);

const wrapForMobile = (items: DropdownMenuItem[]) =>
  items.map((item) => ({
    ...item,
    onSelect: (e: Event) => {
      item.onSelect?.(e);
      headerOpen.value = false;
    },
  }));

const mobileMenuGroups = computed<DropdownMenuItem[][]>(() => {
  const pageGroups = mobileHeaderMenuItems.value as DropdownMenuItem[][];
  return [
    ...(experimental.value
      ? [navigationItems.value as DropdownMenuItem[]]
      : []),
    ...pageGroups,
    permanentMenuItems.value,
    aboutItems.value,
  ].filter((g) => g.length > 0);
});

const navigationItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [
    { label: "Recipes", to: "/", active: route.path === "/" },
  ];
  if (loggedIn.value) {
    items.push(
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
    );
  }
  return items;
});

const modal = await useModalAbout();
const searchModal = await useModalRecipeSearch();

defineShortcuts({
  meta_k: () => searchModal.open(),
});

const aboutItems = computed<DropdownMenuItem[]>(() => [
  { label: "About", onSelect: async () => await modal.open() },
]);

const colorMode = useColorMode();

const desktopMenuGroups = computed<DropdownMenuItem[][]>(() => {
  const pageGroups = desktopHeaderMenuItems.value as DropdownMenuItem[][];
  return [...pageGroups, permanentMenuItems.value, aboutItems.value].filter(
    (g) => g.length > 0,
  );
});

const dropDownMenuItems = computed<DropdownMenuItem[]>(() =>
  flattenMenuGroups(desktopMenuGroups.value),
);

//---------------
// Footer
//---------------

const navRight = computed(() => {
  if (!experimental.value || !loggedIn.value) return undefined;
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
  if (isRecipePage.value) {
    if (hasInAppHistory.value) {
      return { text: "Back to folder", action: goBack };
    }
    if (loggedIn.value || sharing.value.allowPublicBrowsing) {
      return { text: "Browse recipes", to: "/" };
    }
    return undefined;
  }
  if (!experimental.value || !loggedIn.value) return undefined;
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
          v-if="isRecipePage && hasInAppHistory"
          icon="material-symbols:undo"
          size="lg"
          variant="ghost"
          color="neutral"
          label="Back"
          @click.stop="goBack"
        />
        <UButton
          v-else-if="isRecipePage && (loggedIn || sharing.allowPublicBrowsing)"
          icon="material-symbols:grid-view-rounded"
          size="lg"
          variant="ghost"
          color="neutral"
          label="Browse"
          to="/"
        />
        <ULink
          v-else-if="!isRecipePage"
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
        <span
          v-else
          class="text-highlighted flex min-w-0 flex-row items-center gap-2 text-xl font-bold"
        >
          <Icon
            name="material-symbols:chef-hat-rounded"
            size="1.2em"
            class="shrink-0"
          />
          <span class="truncate">{{ appTitle }}</span>
        </span>
      </template>
      <UBreadcrumb
        v-if="experimental"
        :ui="{ root: 'mt-1', link: 'text-md' }"
        :items="navigationItems"
      />
      <template #body>
        <template v-for="(group, i) in mobileMenuGroups" :key="i">
          <USeparator v-if="i > 0" class="my-2" />
          <UNavigationMenu
            :ui="{ root: 'mt-1', link: 'text-md' }"
            :items="wrapForMobile(group) as NavigationMenuItem[]"
            orientation="vertical"
            class="-mx-2.5"
          />
        </template>
      </template>
      <template #right>
        <UButton
          v-if="!isRecipePage"
          variant="ghost"
          color="neutral"
          icon="material-symbols:search"
          @click="searchModal.open()"
        />
        <template v-if="isRecipePage">
          <UButton
            v-for="action in headerActionItems"
            :key="`action-${action.label}`"
            :label="action.label"
            :icon="action.icon"
            :variant="action.variant ?? 'ghost'"
            :color="(action.color as any) ?? 'neutral'"
            :ui="{ label: 'hidden md:flex ' }"
            @click="action.onSelect?.($event)"
          />
        </template>
        <template v-else>
          <UColorModeButton />
        </template>
        <UDropdownMenu
          :items="dropDownMenuItems"
          :content="{ align: 'end' }"
          :modal="false"
        >
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

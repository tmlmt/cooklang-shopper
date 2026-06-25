<script setup lang="ts">
import type {
  BreadcrumbItem,
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";
import { navigateTo } from "#imports";
import { useLanguageSwitcher } from "~/composables/useLanguageSwitcher";

const route = useRoute();
const { title: appTitle, sharing, experimental } = await usePublicConfig();
const { shoppingEnabled } = await useShoppingEnabled();
const { hasInAppHistory } = usePreviousRoute();
const { loggedIn } = useUserSession();
const { $localeRoute } = useNuxtApp();

//---------------
// Header menus
//---------------

const { $ts } = useI18n();

const authMenuItem = computed<DropdownMenuItem>(() =>
  loggedIn.value
    ? {
        label: $ts("pages.authentication"),
        icon: "mdi:user",
        onSelect: () => navigateTo($localeRoute("/auth").href),
      }
    : {
        label: $ts("actions.signIn"),
        icon: "material-symbols:login",
        onSelect: () => navigateTo($localeRoute("/auth").href),
      },
);

const permanentMenuItems = computed<DropdownMenuItem[]>(() => [
  authMenuItem.value,
  {
    label: $ts("nav.toggleColorMode"),
    icon: "material-symbols:dark-mode",
    onSelect: () => {
      colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
    },
  },
  languageMenuItem.value,
]);

const { mobileHeaderMenuItems, desktopHeaderMenuItems, headerActionItems } =
  useHeaderMenu();
const { languageMenuItem } = useLanguageSwitcher();

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
    ...(shoppingEnabled.value || experimental.value
      ? [navigationItems.value as DropdownMenuItem[]]
      : []),
    ...pageGroups,
    permanentMenuItems.value,
    aboutItems.value,
  ].filter((g) => g.length > 0);
});

const navigationItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [
    {
      label: $ts("pages.recipes"),
      to: $localeRoute("/"),
      active: route.path === "/",
    },
  ];
  if (loggedIn.value) {
    if (shoppingEnabled.value) {
      items.push({
        label: $ts("pages.pantry"),
        to: $localeRoute("/pantry"),
        active: route.path === "/pantry",
      });
      items.push({
        label: $ts("pages.shoppingList"),
        to: $localeRoute("/list"),
        active: route.path === "/list",
      });
    }
    if (experimental.value) {
      items.push({
        label: $ts("pages.shoppingCart"),
        to: $localeRoute("/cart"),
        active: route.path === "/cart",
      });
    }
  }
  return items;
});

const modal = await useModalAbout();
const searchModal = await useModalRecipeSearch();

defineShortcuts({
  meta_k: () => searchModal.open(),
});

const aboutItems = computed<DropdownMenuItem[]>(() => [
  { label: $ts("nav.about"), onSelect: async () => await modal.open() },
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
  if (!loggedIn.value) return undefined;
  if (route.path === "/" && shoppingEnabled.value) {
    return {
      text: $ts("nav.continueTo", { page: $ts("pages.pantry") }),
      to: $localeRoute("/pantry"),
    };
  } else if (route.path === "/pantry") {
    return {
      text: $ts("nav.continueTo", { page: $ts("pages.shoppingList") }),
      to: $localeRoute("/list"),
    };
  } else if (route.path === "/list" && experimental.value) {
    return {
      text: $ts("nav.continueTo", { page: $ts("pages.shoppingCart") }),
      to: $localeRoute("/cart"),
    };
  } else {
    return undefined;
  }
});

const router = useRouter();

const goBack = () => router.back();

const navLeft = computed(() => {
  if (isRecipePage.value) {
    if (hasInAppHistory.value) {
      return { text: $ts("nav.backToFolder"), action: goBack };
    }
    if (loggedIn.value || sharing.value.allowPublicBrowsing) {
      return {
        text: $ts("nav.backTo", { page: $ts("pages.recipes") }),
        to: $localeRoute("/"),
      };
    }
    return undefined;
  }
  if (!loggedIn.value) return undefined;
  if (route.path === "/pantry") {
    return {
      text: $ts("nav.backTo", { page: $ts("pages.recipes") }),
      to: $localeRoute("/"),
    };
  } else if (route.path === "/list") {
    return {
      text: $ts("nav.backTo", { page: $ts("pages.pantry") }),
      to: $localeRoute("/pantry"),
    };
  } else if (route.path === "/cart") {
    return {
      text: $ts("nav.backTo", { page: $ts("pages.shoppingList") }),
      to: $localeRoute("/list"),
    };
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
          :label="$ts('actions.back')"
          @click.stop="goBack"
        />
        <UButton
          v-else-if="isRecipePage && (loggedIn || sharing.allowPublicBrowsing)"
          icon="material-symbols:grid-view-rounded"
          size="lg"
          variant="ghost"
          color="neutral"
          :label="$ts('actions.browse')"
          :to="$localeRoute('/')"
        />
        <i18n-link
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
        </i18n-link>
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
        v-if="shoppingEnabled || experimental"
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
        <template v-if="headerActionItems.length > 0">
          <UButton
            v-for="action in headerActionItems"
            :key="`action-${action.label}`"
            :label="action.label"
            :icon="action.icon"
            class="hover:cursor-pointer"
            :variant="action.variant ?? 'ghost'"
            :color="(action.color as any) ?? 'neutral'"
            :ui="{ label: 'hidden md:flex ' }"
            @click="action.onSelect?.($event)"
          />
        </template>
        <UDropdownMenu
          :items="dropDownMenuItems"
          :content="{ align: 'end' }"
          class="hover:cursor-pointer"
          :ui="{ item: 'hover:cursor-pointer' }"
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
          @click="navLeft.action ? navLeft.action() : navigateTo(navLeft.to)"
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

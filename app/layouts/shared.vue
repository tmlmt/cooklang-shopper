<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const { title: appTitle } = await usePublicConfig();
const modal = await useModalAbout();
const { mobileHeaderMenuItems, desktopHeaderMenuItems } = useHeaderMenu();

const headerOpen = ref(false);

const aboutItems = computed<DropdownMenuItem[]>(() => [
  { label: "About", onSelect: async () => await modal.open() },
]);

const dropdownItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = [
    ...(desktopHeaderMenuItems.value as DropdownMenuItem[]),
  ];
  if (items.length > 0) items.push({ type: "separator" });
  items.push(...aboutItems.value);
  return items;
});

const mobileItems = computed(() =>
  [
    ...(mobileHeaderMenuItems.value as DropdownMenuItem[]),
    ...(aboutItems.value as DropdownMenuItem[]),
  ].map((item) => ({
    ...item,
    onSelect: (e: Event) => {
      if ("onSelect" in item && item.onSelect) item.onSelect(e);
      headerOpen.value = false;
    },
  })),
);
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
        <span
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
      <template #body>
        <UNavigationMenu
          :ui="{ root: 'mt-1', link: 'text-md' }"
          :items="mobileItems as NavigationMenuItem[]"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
      <template #right>
        <UColorModeButton />
        <UDropdownMenu
          :items="dropdownItems"
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
  </div>
</template>

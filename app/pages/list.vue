<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

definePageMeta({
  title: "Shopping List",
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

const siteConfig = useSiteConfig();

defineOgImage(
  "DefaultOgImage",
  {
    title: siteConfig.name,
    subtitle: "Authentication",
    description: "Sign in to access your cookbook",
  },
  [
    // Primary image for og:image and twitter:image (1200x600)
    { key: "og" },
    // Additional square image for WhatsApp (800x800)
    { key: "whatsapp", width: 800, height: 800 },
  ],
);

const shoppingStore = useShoppingStore();
const toast = useToast();
await useAsyncData("shopping-list", async () => {
  await shoppingStore.fetchList();
  return null;
});

// Check for expired shared list on mount (token may have been set before navigating here)
onMounted(() => {
  shoppingStore.connectToUpdates();
  const expiresAt = shoppingStore.sharedExpiresAt;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    void shoppingStore.switchToOwnList();
    toast.add({
      color: "warning",
      title: "Shared list expired",
      description:
        "The shared list link has expired. Switched to your own list.",
    });
  }
});

const {
  setHeaderActions,
  clearHeaderActions,
  setHeaderMenuItems,
  clearHeaderMenuItems,
} = useHeaderMenu();
const { isEditor } = useRole();
const modalStoreRun = await useModalStoreRun();
const modalShare = await useModalShareShoppingList();
const modalCategoryConfig = await useModalCategoryConfig();

const storeRunItem: DropdownMenuItem = {
  label: "Store Run",
  icon: "i-lucide-shopping-cart",
  color: "secondary",
  variant: "soft",
  onSelect: () => modalStoreRun.open(),
};

const shareItem: DropdownMenuItem = {
  label: "Share",
  icon: "i-lucide-share-2",
  color: "neutral",
  variant: "ghost",
  onSelect: () => modalShare.open(),
};

const categoryConfigItem: DropdownMenuItem = {
  label: "Category Config",
  icon: "material-symbols:category",
  onSelect: () => modalCategoryConfig.open(),
};

setHeaderMenuItems([categoryConfigItem]);

onUnmounted(() => {
  shoppingStore.disconnectFromUpdates();
  clearHeaderMenuItems();
});

watch(
  () => shoppingStore.ingredients.length,
  (length) => {
    if (length > 0) {
      setHeaderActions(
        isEditor.value ? [storeRunItem, shareItem] : [storeRunItem],
      );
    } else {
      clearHeaderActions();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="mt-4 flex w-full flex-col gap-4 px-4 md:mt-0 md:px-0">
    <UAlert
      v-if="shoppingStore.sharedToken"
      color="info"
      variant="soft"
      :title="`Viewing ${shoppingStore.sharedOwnerName}'s shopping list, which you can fully edit. Refreshing the page or clicking on the button below will switch back to your own list.`"
      :description="
        shoppingStore.sharedExpiresAt
          ? `This link expires on ${new Date(shoppingStore.sharedExpiresAt).toLocaleDateString()}`
          : undefined
      "
      :ui="{ root: 'mb-2' }"
    >
      <template #actions>
        <UButton
          label="Switch to own list"
          color="info"
          variant="outline"
          size="sm"
          @click="shoppingStore.switchToOwnList()"
        />
      </template>
    </UAlert>
    <div class="flex flex-row items-center gap-1">
      <h1 class="text-base font-bold md:text-lg">Shopping List</h1>
      <span
        v-if="shoppingStore.recipeSelection.length"
        class="text-sm md:text-base"
        >· {{ shoppingStore.recipeSelection.length }} recipe{{
          shoppingStore.recipeSelection.length > 1 ? "s" : ""
        }}</span
      >
    </div>
    <ShoppingListContent
      :recipe-selection="shoppingStore.recipeSelection"
      :ingredients="shoppingStore.ingredients"
      :manual-items="shoppingStore.manualItems"
      :categories="shoppingStore.categories"
      :is-checked-fn="shoppingStore.isChecked"
      :on-check-fn="shoppingStore.checkIngredient"
      :on-uncheck-all-fn="shoppingStore.uncheckAll"
      :on-edit-servings-fn="(p, v, c) => shoppingStore.editServings(p, v, c)"
      :on-remove-recipe-fn="shoppingStore.removeRecipe"
      :on-add-manual-item-fn="shoppingStore.addManualItem"
      :on-remove-manual-item-fn="shoppingStore.removeManualItem"
      :show-choices="true"
      :track-initial-servings="true"
    />
  </div>
</template>

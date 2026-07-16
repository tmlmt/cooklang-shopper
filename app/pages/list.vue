<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { $ts, $tc, $td } = useI18n();

useSeoMeta({
  title: $ts("pages.shoppingList"),
  description: $ts("description"),
});

const siteConfig = useSiteConfig();

defineOgImage(
  "DefaultOgImage",
  {
    title: siteConfig.name,
    subtitle: $ts("pages.shoppingList"),
    description: $ts("description"),
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
const sse = useShoppingSSE(shoppingStore.applyResponse);

onMounted(() => {
  sse.connect();
  const expiresAt = shoppingStore.sharedExpiresAt;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    void shoppingStore.switchToOwnList();
    toast.add({
      color: "warning",
      title: $ts("toast.sharedListExpired"),
      description: $ts("toast.sharedListExpiredDetail"),
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
  label: $ts("actions.storeRun"),
  icon: "i-lucide-shopping-cart",
  color: "secondary",
  variant: "soft",
  onSelect: () => modalStoreRun.open(),
};

const shareItem: DropdownMenuItem = {
  label: $ts("actions.share"),
  icon: "i-lucide-share-2",
  color: "neutral",
  variant: "ghost",
  onSelect: () => modalShare.open(),
};

const categoryConfigItem: DropdownMenuItem = {
  label: $ts("actions.categoryConfig"),
  icon: "material-symbols:category",
  onSelect: async () => {
    const saved = await modalCategoryConfig.open();
    if (saved) await shoppingStore.fetchList();
  },
};

setHeaderMenuItems([categoryConfigItem]);

onUnmounted(() => {
  sse.disconnect();
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
      :title="
        $ts('viewingSharedList', { owner: shoppingStore.sharedOwnerName ?? '' })
      "
      :description="
        shoppingStore.sharedExpiresAt
          ? $ts('sharedLink.linkExpires', {
              date: $td(new Date(shoppingStore.sharedExpiresAt), {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }),
            })
          : undefined
      "
      :ui="{ root: 'mb-2' }"
    >
      <template #actions>
        <UButton
          :label="$ts('actions.switchToOwnList')"
          color="info"
          variant="outline"
          size="sm"
          @click="shoppingStore.switchToOwnList()"
        />
      </template>
    </UAlert>
    <div class="flex flex-row items-center gap-1">
      <span
        v-if="shoppingStore.recipeSelection.length"
        class="text-sm md:text-base"
        >·
        {{ $tc("folder.recipes", shoppingStore.recipeSelection.length) }}</span
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
      :on-clear-recipes-fn="shoppingStore.clearRecipes"
      :on-add-manual-item-fn="shoppingStore.addManualItem"
      :on-remove-manual-item-fn="shoppingStore.removeManualItem"
      :on-clear-manual-items-fn="shoppingStore.clearManualItems"
      :on-clear-list-fn="shoppingStore.clearList"
      :show-choices="true"
      :track-initial-servings="true"
    />
  </div>
</template>

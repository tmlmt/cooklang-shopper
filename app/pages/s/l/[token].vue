<script setup lang="ts">
import type { ShoppingListResponse } from "~/composables/useShoppingListActions";

definePageMeta({
  layout: "shared",
  middleware: ["shared-list-redirect"],
});

interface ResolveResponse extends ShoppingListResponse {
  ownerName: string;
  expiresAt: string | null;
}

const route = useRoute();
const token = route.params.token as string;

const { data, error } = await useFetch<ResolveResponse>(
  `/api/sharing/list/resolve/${token}`,
);

if (error.value) {
  throw createError({
    status: error.value.status ?? 404,
    statusText: error.value.statusText ?? "Share link not found",
  });
}

const { $t, $ts } = useI18n();

//---------------------------
// OG Image
//---------------------------

defineOgImage("DefaultOgImage", {
  title: $ts("ogImageTitle"),
  subtitle: $ts("ogImageSubtitle", {
    username: data.value?.ownerName ?? $ts("basics.unknown"),
  }),
  description: $ts("description"),
});

//---------------------------
// Metadata
//---------------------------

useSeoMeta({
  title: $ts("title", {
    username: data.value?.ownerName ?? $ts("basics.unknown"),
  }),
  ogTitle: $ts("title", {
    username: data.value?.ownerName ?? $ts("basics.unknown"),
  }),
  description: $ts("description"),
  ogDescription: $ts("description"),
});

const { loggedIn } = useUserSession();

const shoppingList = !loggedIn.value
  ? useSharedShoppingList(token, data.value!)
  : null;

const { setHeaderActions, clearHeaderActions } = useHeaderMenu();

if (!loggedIn.value) {
  const sse = useShoppingSSE(shoppingList!.applyResponse, token);
  onMounted(() => sse.connect());
  onUnmounted(() => sse.disconnect());

  const modalStoreRun = await useModalStoreRun();

  watch(
    () => shoppingList!.ingredients.value.length,
    (length) => {
      if (length > 0) {
        setHeaderActions([
          {
            label: $ts("actions.storeRun"),
            icon: "i-lucide-shopping-cart",
            color: "secondary",
            variant: "soft",
            onSelect: () =>
              modalStoreRun.open({
                ingredientsFn: () => shoppingList!.ingredients.value,
                isCheckedFn: shoppingList!.isChecked,
                onCheckFn: shoppingList!.checkIngredient,
                onUncheckAllFn: shoppingList!.uncheckAll,
                applyResponseFn: shoppingList!.applyResponse,
                sseToken: token,
              }),
          },
        ]);
      } else {
        clearHeaderActions();
      }
    },
    { immediate: true },
  );
}
</script>

<template>
  <UContainer class="py-8">
    <div v-if="loggedIn" class="flex h-64 w-full items-center justify-center">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl" />
    </div>
    <div v-else class="flex flex-col gap-4">
      <div>
        <h1 class="text-2xl">
          <span class="font-bold">{{ $t("pages.shoppingList") }}</span>
          {{ $t("sharedBy") }}
          {{ data?.ownerName }}
        </h1>
        <p v-if="data?.expiresAt" class="mt-1 text-sm text-amber-600">
          {{
            $t("sharedLink.linkExpires", {
              date: $td(new Date(data.expiresAt), {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }),
            })
          }}
        </p>
        <p class="text-muted mt-1 text-sm">
          <i18n-link to="/auth">{{ $t("actions.signIn") }}</i18n-link>
          {{ $t("signInToEdit") }}
        </p>
      </div>

      <ShoppingListContent
        :recipe-selection="shoppingList!.recipeSelection.value"
        :ingredients="shoppingList!.ingredients.value"
        :manual-items="shoppingList!.manualItems.value"
        :categories="shoppingList!.categories.value"
        :is-checked-fn="shoppingList!.isChecked"
        :on-check-fn="
          (name, checked) => shoppingList!.checkIngredient(name, checked)
        "
        :on-uncheck-all-fn="shoppingList!.uncheckAll"
      />
    </div>
  </UContainer>
</template>

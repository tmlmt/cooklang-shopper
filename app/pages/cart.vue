<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";
import {
  formatQuantityWithUnit,
  type ProductMisMatch,
  type ProductSelection,
} from "@tmlmt/cooklang-parser";
import type { OnlineStoreItem } from "~~/shared/types";

const { $t, $ts, $tc, $localeRoute } = useI18n();

useSeoMeta({
  title: $ts("pages.shoppingCart"),
  description: $ts("description"),
});

const { cart, misMatch, summary } = await useShoppingCart();

const catalogStore = useCatalogStore();
const shoppingStore = useShoppingStore();

const catalogEmpty = computed(() => !catalogStore.rawCatalog.trim());
const listEmpty = computed(() => shoppingStore.ingredients.length === 0);

function formatPrice(value: number): string {
  return value.toFixed(2);
}

// --- Online store integration ---
const { onlineStoreProvider, onlineStoreCartUrl } = await usePublicConfig();
const onlineStore = useOnlineStoreStore();
const openConnectModal = useModalOnlineStoreConnect();
const toast = useToast();

const storeConfigured = computed(() => !!onlineStoreProvider.value);

const currentItems = computed<OnlineStoreItem[]>(() =>
  (cart.value ?? []).map((p) => ({
    productId: p.product.id,
    quantity: p.quantity,
  })),
);

function toItemsMap(items: OnlineStoreItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) map.set(item.productId, item.quantity);
  return map;
}

const inSync = computed(() => {
  const current = toItemsMap(currentItems.value);
  const sent = toItemsMap(onlineStore.lastSent);
  if (current.size !== sent.size) return false;
  for (const [id, qty] of current) {
    if (sent.get(id) !== qty) return false;
  }
  return true;
});

const hasSent = computed(() => onlineStore.lastSent.length > 0);
const sending = ref(false);
const failedItems = ref<Array<OnlineStoreItem & { error: string }>>([]);

onMounted(async () => {
  if (!storeConfigured.value) return;
  try {
    await onlineStore.fetchStatus();
  } catch {
    // status is best-effort; ignore failures
  }
});

async function connect() {
  if (!onlineStoreProvider.value) return;
  const ok = await openConnectModal.open(onlineStoreProvider.value);
  if (ok) {
    toast.add({ color: "success", title: $ts("onlineStore.connected") });
  }
}

async function disconnect() {
  await onlineStore.logout();
  failedItems.value = [];
  toast.add({ color: "neutral", title: $ts("onlineStore.disconnected") });
}

function extractMessage(err: unknown): string | undefined {
  return (
    (err as { data?: { message?: string } })?.data?.message ??
    (err as { message?: string })?.message
  );
}

async function sendCart() {
  sending.value = true;
  failedItems.value = [];
  try {
    const result = await onlineStore.syncCart(currentItems.value);
    failedItems.value = result.failed;
    if (result.failed.length > 0) {
      toast.add({
        color: "warning",
        title: $tc("onlineStore.syncPartial", result.failed.length),
      });
    } else {
      toast.add({ color: "success", title: $ts("onlineStore.syncSuccess") });
    }
  } catch (err: unknown) {
    toast.add({
      color: "error",
      title: $ts("onlineStore.syncFailed"),
      description: extractMessage(err),
      duration: 5000,
    });
  } finally {
    sending.value = false;
  }
}

async function clearOnlineCart() {
  sending.value = true;
  failedItems.value = [];
  try {
    const result = await onlineStore.clearCart();
    failedItems.value = result.failed;
    toast.add({ color: "success", title: $ts("onlineStore.cleared") });
  } catch (err: unknown) {
    toast.add({
      color: "error",
      title: $ts("onlineStore.clearFailed"),
      description: extractMessage(err),
      duration: 5000,
    });
  } finally {
    sending.value = false;
  }
}

const columnsCart: TableColumn<ProductSelection>[] = [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    footer: $ts("summaryTotal"),
  },
  {
    accessorKey: "productName",
    header: () => $t("columnProduct"),
    cell: ({ row }) => row.original.product.productName,
  },
  {
    accessorKey: "ingredientName",
    header: () => $t("columnIngredient"),
    cell: ({ row }) => row.original.product.ingredientName,
  },
  {
    accessorKey: "quantity",
    header: () => $t("columnQuantity"),
    cell: ({ row }) => row.getValue("quantity"),
    footer: ({ column }) => {
      return column
        .getFacetedRowModel()
        .rows.reduce(
          (sum, row: TableRow<ProductSelection>) =>
            sum + Number.parseFloat(row.getValue("quantity")),
          0,
        );
    },
  },
  {
    accessorKey: "totalPrice",
    header: () => $t("columnPrice"),
    cell: ({ row }) => formatPrice(row.original.totalPrice),
    footer: formatPrice(summary.value.totalPrice),
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
    cell: ({ row }) => $t(misMatchReasonToText(row.original.reason)),
  },
];
</script>

<template>
  <div class="mt-4 flex w-full flex-col gap-4 px-4 md:mt-0 md:px-0">
    <UAlert
      v-if="catalogEmpty"
      color="warning"
      variant="soft"
      icon="i-lucide-package-open"
      :title="$ts('emptyCatalogHint')"
    >
      <template #actions>
        <UButton
          :label="$ts('goToCatalog')"
          color="warning"
          variant="outline"
          size="sm"
          :to="$localeRoute('/catalog')"
        />
      </template>
    </UAlert>
    <UAlert
      v-else-if="listEmpty"
      color="info"
      variant="soft"
      icon="i-lucide-list"
      :title="$ts('emptyListHint')"
    >
      <template #actions>
        <UButton
          :label="$ts('goToList')"
          color="info"
          variant="outline"
          size="sm"
          :to="$localeRoute('/list')"
        />
      </template>
    </UAlert>

    <div class="flex w-full flex-col gap-6 md:flex-row md:items-start">
      <!-- Left column: matched products (primary) -->
      <div class="flex flex-col gap-3 md:flex-1">
        <h2 class="text-base font-bold md:text-lg">{{ $t("cart") }}</h2>
        <UTable
          v-if="cart && cart.length > 0"
          :data="cart"
          :columns="columnsCart"
          :ui="{ td: 'px-2 py-1.5', th: 'px-2 py-1.5 text-xs' }"
        />
        <p v-else class="text-sm text-muted">{{ $ts("emptyCart") }}</p>
      </div>

      <!-- Right column: unmatched ingredients + store panel -->
      <div class="flex flex-col gap-4 md:w-2/5">
        <UCard
          :ui="{
            root: 'bg-neutral-50 dark:bg-neutral-900',
            body: 'p-3 sm:p-4',
          }"
        >
          <template #header>
            <h2 class="text-sm font-semibold">
              {{ $t("noMatchingProducts") }}
            </h2>
          </template>
          <UTable
            v-if="misMatch && misMatch.length > 0"
            :data="misMatch"
            :columns="columnsMisMatch"
            :ui="{ td: 'px-2 py-1.5', th: 'px-2 py-1.5 text-xs' }"
          />
          <p v-else class="text-sm text-muted">{{ $ts("emptyMisMatch") }}</p>
        </UCard>

        <UCard
          v-if="storeConfigured"
          :ui="{
            root: 'bg-neutral-50 dark:bg-neutral-900',
            body: 'p-3 sm:p-4',
          }"
        >
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold">
                {{ $ts("onlineStore.sendToStore") }}
              </h2>
              <UBadge
                v-if="onlineStore.connected"
                color="success"
                variant="soft"
                size="sm"
                :label="onlineStore.provider ?? ''"
              />
            </div>
          </template>

          <!-- Not connected -->
          <template v-if="!onlineStore.connected">
            <p class="text-sm text-muted">
              {{ $ts("onlineStore.sendToStoreHint") }}
            </p>
            <UButton
              :label="
                $ts('onlineStore.connectTo', {
                  provider: onlineStoreProvider ?? '',
                })
              "
              color="primary"
              icon="i-lucide-plug"
              class="mt-3"
              @click="connect"
            />
          </template>

          <!-- Connected -->
          <template v-else>
            <p v-if="inSync && hasSent" class="text-sm text-muted">
              {{ $ts("onlineStore.upToDate") }}
            </p>
            <p v-else-if="cart && cart.length > 0" class="text-sm text-muted">
              {{ $ts("onlineStore.readyToSend") }}
            </p>
            <p v-else class="text-sm text-muted">
              {{ $ts("onlineStore.nothingToSend") }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
              <UButton
                :label="
                  hasSent
                    ? $ts('onlineStore.updateCart')
                    : $ts('onlineStore.sendCart')
                "
                color="primary"
                :icon="hasSent ? 'i-lucide-arrow-down-up' : 'i-lucide-arrow-up'"
                :loading="sending"
                :disabled="(inSync && hasSent) || !(cart && cart.length > 0)"
                @click="sendCart"
              />
              <UButton
                v-if="hasSent && onlineStoreCartUrl"
                :label="$ts('onlineStore.goToCart')"
                color="neutral"
                variant="soft"
                icon="i-lucide-external-link"
                :to="onlineStoreCartUrl"
                target="_blank"
              />
              <UButton
                v-if="hasSent"
                :label="$ts('onlineStore.clearCart')"
                color="neutral"
                variant="soft"
                icon="i-lucide-trash-2"
                :loading="sending"
                @click="clearOnlineCart"
              />
              <UButton
                :label="$ts('onlineStore.disconnect')"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="disconnect"
              />
            </div>

            <UAlert
              v-if="failedItems.length > 0"
              class="mt-3"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              :title="$tc('onlineStore.syncPartial', failedItems.length)"
            >
              <template #description>
                <ul class="list-disc pl-4">
                  <li v-for="item in failedItems" :key="item.productId">
                    {{ item.productId }}: {{ item.error }}
                  </li>
                </ul>
              </template>
            </UAlert>
          </template>
        </UCard>
      </div>
    </div>
  </div>
</template>

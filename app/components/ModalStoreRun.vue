<script setup lang="ts">
import type { AddedIngredient } from "@tmlmt/cooklang-parser";

const props = withDefaults(
  defineProps<{
    ingredientsFn?: () => AddedIngredient[];
    isCheckedFn?: (name: string) => boolean;
    onCheckFn?: (name: string, checked: boolean) => void | Promise<void>;
    onUncheckAllFn?: () => void | Promise<void>;
    connectFn?: () => void;
    disconnectFn?: () => void;
    sseUpdateSignal?: Ref<number>;
  }>(),
  {
    ingredientsFn: undefined,
    isCheckedFn: undefined,
    onCheckFn: undefined,
    onUncheckAllFn: undefined,
    connectFn: undefined,
    disconnectFn: undefined,
    sseUpdateSignal: undefined,
  },
);

const emit = defineEmits<{ close: [] }>();

defineShortcuts({ escape: () => emit("close") });

const shoppingStore = useShoppingStore();

const ingredients = computed(
  () => props.ingredientsFn?.() ?? shoppingStore.ingredients,
);
const isCheckedFn = computed(
  () => props.isCheckedFn ?? ((name: string) => shoppingStore.isChecked(name)),
);
const onCheckFn = computed(
  () =>
    props.onCheckFn ??
    ((name: string, checked: boolean) =>
      shoppingStore.checkIngredient(name, checked)),
);

const total = computed(() => ingredients.value.length);
const checkedCount = computed(
  () => ingredients.value.filter((i) => isCheckedFn.value(i.name)).length,
);

function uncheckAll() {
  if (props.onUncheckAllFn) return props.onUncheckAllFn();
  return shoppingStore.uncheckAll();
}

onMounted(() => {
  (props.connectFn ?? shoppingStore.connectToUpdates)();
});

onUnmounted(() => {
  (props.disconnectFn ?? shoppingStore.disconnectFromUpdates)();
});

const flashActive = ref(false);
watch(
  () => props.sseUpdateSignal?.value ?? shoppingStore.sseUpdateCount,
  () => {
    flashActive.value = true;
    setTimeout(() => {
      flashActive.value = false;
    }, 800);
  },
);
</script>

<template>
  <UModal
    fullscreen
    :close="{ onClick: () => emit('close') }"
    :ui="{
      content: 'flex flex-col',
      header: 'p-0 min-h-0 border-0',
      body: 'flex-1 overflow-y-auto p-0',
      footer: 'p-4 justify-between',
    }"
  >
    <template #header>
      <div
        class="flex w-full items-center gap-4 border-b border-neutral-200 px-6 py-3 dark:border-neutral-800"
      >
        <span class="font-semibold">Store Run</span>
        <UProgress v-model="checkedCount" :max="total" class="flex-1" />
        <span class="text-muted text-sm tabular-nums"
          >{{ checkedCount }} / {{ total }}</span
        >
        <span class="flex items-center gap-1.5 text-xs text-green-500">
          <span
            class="inline-block size-2 animate-pulse rounded-full bg-green-500"
          />
          Live
        </span>
      </div>
    </template>

    <template #body>
      <div
        class="mx-auto w-full max-w-3xl px-4 py-6 transition-colors duration-500 sm:px-8"
        :class="flashActive ? 'bg-primary/5' : ''"
      >
        <IngredientList
          :ingredients="ingredients"
          :is-checked-fn="isCheckedFn"
          :on-check-fn="onCheckFn"
          :show-header="false"
        />
      </div>
    </template>

    <template #footer>
      <UButton
        label="Uncheck All"
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="soft"
        :disabled="checkedCount === 0"
        @click="uncheckAll()"
      />
      <UButton
        label="Done"
        color="neutral"
        variant="ghost"
        @click="emit('close')"
      />
    </template>
  </UModal>
</template>

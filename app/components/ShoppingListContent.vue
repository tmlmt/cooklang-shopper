<script setup lang="ts">
import { computed, h } from "vue";
import { useNuxtApp } from "#imports";
import type { TableColumn } from "@nuxt/ui";
import type { RecipeInfo } from "~~/shared/types";
import type { RecipeChoices, AddedIngredient } from "@tmlmt/cooklang-parser";
import * as v from "valibot";

const props = withDefaults(
  defineProps<{
    recipeSelection: RecipeInfo[];
    ingredients: AddedIngredient[];
    manualItems: AddedIngredient[];
    categories?: Record<string, AddedIngredient[]>;
    isCheckedFn: (name: string) => boolean;
    onCheckFn: (name: string, checked: boolean) => void | Promise<void>;
    onUncheckAllFn?: () => void | Promise<void>;
    canEditServings?: boolean;
    onEditServingsFn?: (
      path: string,
      value: number,
      choices?: RecipeChoices,
    ) => Promise<void>;
    onRemoveRecipeFn?: (path: string) => Promise<void>;
    showChoices?: boolean;
    trackInitialServings?: boolean;
    onAddManualItemFn?: (
      name: string,
      qty?: string,
      unit?: string,
    ) => Promise<void>;
    onRemoveManualItemFn?: (index: number) => Promise<void>;
    onClearRecipesFn?: () => Promise<void>;
    onClearManualItemsFn?: () => Promise<void>;
    onClearListFn?: () => Promise<void>;
  }>(),
  {
    canEditServings: true,
    showChoices: false,
    trackInitialServings: false,
    categories: undefined,
    onUncheckAllFn: undefined,
    onEditServingsFn: undefined,
    onRemoveRecipeFn: undefined,
    onAddManualItemFn: undefined,
    onRemoveManualItemFn: undefined,
    onClearRecipesFn: undefined,
    onClearManualItemsFn: undefined,
    onClearListFn: undefined,
  },
);

const { $t, $ts } = useI18n();
const toast = useToast();

const anyChecked = computed(() =>
  props.ingredients.some((i) => props.isCheckedFn(i.name)),
);

// ---------------------------------------------------------------------------
// Servings editing
// ---------------------------------------------------------------------------

const pendingServings = ref<Record<string, boolean>>({});
const draftServings = ref<Record<string, number>>({});
const saveTimers = ref<Record<string, ReturnType<typeof setTimeout>>>({});

const initialServings = ref<Record<string, number>>(
  props.trackInitialServings
    ? Object.fromEntries(props.recipeSelection.map((r) => [r.path, r.servings]))
    : {},
);

function clearSaveTimer(path: string): void {
  const timer = saveTimers.value[path];
  if (!timer) return;
  clearTimeout(timer);
  const { [path]: _removed, ...rest } = saveTimers.value;
  saveTimers.value = rest;
}

function servingsStepFrom(base: number | undefined): number {
  if (!base) return 1;
  if (Number.isInteger(base)) {
    return 10 ** (String(base).match(/0+$/) || [""])[0].length;
  }
  if (base < 1) return base;
  let n = 2;
  while (base / n >= 1) n++;
  return base / n;
}

async function saveServings(
  path: string,
  value: number,
  choices?: RecipeChoices,
): Promise<void> {
  if (pendingServings.value[path] || !props.onEditServingsFn) return;
  pendingServings.value[path] = true;
  try {
    await props.onEditServingsFn(path, value, choices);
    const { [path]: _removed, ...rest } = draftServings.value;
    draftServings.value = rest;
  } catch {
    toast.add({
      color: "error",
      title: $ts("toast.error"),
      description: $ts("toast.servingsUpdateError"),
    });
  } finally {
    pendingServings.value[path] = false;
  }
}

function scheduleServingsSave(
  path: string,
  value: number,
  choices?: RecipeChoices,
): void {
  clearSaveTimer(path);
  saveTimers.value[path] = setTimeout(() => {
    clearSaveTimer(path);
    void saveServings(path, value, choices);
  }, 1000);
}

onBeforeUnmount(() => {
  Object.values(saveTimers.value).forEach((timer) => clearTimeout(timer));
  saveTimers.value = {};
});

// ---------------------------------------------------------------------------
// Free-hand item form
// ---------------------------------------------------------------------------

const addItemSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty($ts("validation.ingredientRequired")),
  ),
  quantity: v.pipe(v.string(), v.trim()),
  unit: v.pipe(v.string(), v.trim()),
});

type AddItemSchema = v.InferOutput<typeof addItemSchema>;

const addItemState = reactive<AddItemSchema>({
  name: "",
  quantity: "",
  unit: "",
});

const addItemFormRef = useTemplateRef<{ clear: () => void }>("addItemForm");

async function addManualIngredient(): Promise<void> {
  if (!props.onAddManualItemFn) return;
  try {
    await props.onAddManualItemFn(
      addItemState.name,
      addItemState.quantity || undefined,
      addItemState.unit || undefined,
    );
    addItemState.name = "";
    addItemState.quantity = "";
    addItemState.unit = "";
    await nextTick();
    addItemFormRef.value?.clear();
    toast.add({
      color: "success",
      title: $ts("toast.success"),
      description: $ts("toast.ingredientAdded"),
    });
  } catch {
    toast.add({
      color: "error",
      title: $ts("toast.error"),
      description: $ts("toast.ingredientAddError"),
    });
  }
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const UButton = resolveComponent("UButton");
const ULink = resolveComponent("ULink");
const UInputNumber = resolveComponent("UInputNumber");
const UBadge = resolveComponent("UBadge");
const { $localeRoute } = useNuxtApp();

function choicesLabel(choices?: RecipeChoices): string | null {
  if (!choices) return null;
  const hasAlts =
    (choices.ingredientItems?.size ?? 0) > 0 ||
    (choices.ingredientGroups?.size ?? 0) > 0;
  if (choices.variant && hasAlts) return `${choices.variant} + custom`;
  if (choices.variant) return choices.variant;
  if (hasAlts) return $ts("shoppingList.customChoices");
  return null;
}

const columns = computed<TableColumn<RecipeInfo>[]>(() => {
  const cols: TableColumn<RecipeInfo>[] = [
    {
      accessorKey: "title",
      header: () => $t("shoppingList.nameColumn"),
      cell: ({ row }) =>
        h(ULink, { to: $localeRoute(`/recipe/${row.original.path}`) }, () =>
          row.getValue("title"),
        ),
    },
    {
      accessorKey: "servings",
      header: () => $t("shoppingList.servingsColumn"),
      meta: { class: { td: "w-36" } },
      cell: ({ row }) => {
        const path = row.original.path;
        const choices = row.original.choices;
        const step = servingsStepFrom(row.original.servings);
        const currentValue = draftServings.value[path] ?? row.original.servings;
        const originalValue = initialServings.value[path];

        if (!props.canEditServings || !props.onEditServingsFn) {
          return h("span", currentValue);
        }

        return h("div", { class: "flex items-center gap-1" }, [
          h(UInputNumber, {
            modelValue: currentValue,
            step,
            min: step,
            ui: { base: "w-22" },
            size: "sm",
            disabled: pendingServings.value[path],
            "onUpdate:modelValue": (v: number | null) => {
              if (typeof v === "number") {
                draftServings.value[path] = v;
                scheduleServingsSave(path, v, choices);
              }
            },
            onBlur: () => {
              clearSaveTimer(path);
              const value = draftServings.value[path] ?? row.original.servings;
              void saveServings(path, value, choices);
            },
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === "Enter") {
                clearSaveTimer(path);
                const value =
                  draftServings.value[path] ?? row.original.servings;
                void saveServings(path, value, choices);
              }
            },
          }),
          props.trackInitialServings &&
          originalValue !== undefined &&
          currentValue !== originalValue
            ? h(UButton, {
                icon: "i-lucide-rotate-ccw",
                color: "neutral",
                variant: "ghost",
                size: "sm",
                onClick: () => {
                  clearSaveTimer(path);
                  const { [path]: _removed, ...rest } = draftServings.value;
                  draftServings.value = rest;
                  void saveServings(path, originalValue, choices);
                },
              })
            : null,
        ]);
      },
    },
  ];

  if (props.showChoices) {
    cols.push({
      accessorKey: "choices",
      header: () => $t("shoppingList.choicesColumn"),
      cell: ({ row }) => {
        const label = choicesLabel(row.original.choices);
        if (!label) return $t("shoppingList.noChoice");
        return h(UBadge, { color: "neutral", variant: "subtle" }, () => label);
      },
    });
  }

  if (props.onRemoveRecipeFn) {
    cols.push({
      accessorKey: "actions",
      header: "",
      meta: { class: { td: "w-10" } },
      cell: ({ row }) =>
        h(UButton, {
          icon: "prime:trash",
          color: "error",
          size: "sm",
          variant: "ghost",
          onClick: async () => {
            await props.onRemoveRecipeFn!(row.original.path);
            toast.add({
              color: "success",
              title: $ts("toast.success"),
              description: $ts("toast.recipeRemovedFromList"),
            });
          },
        }),
    });
  }

  return cols;
});
</script>

<template>
  <div class="flex w-full flex-col gap-6 md:flex-row md:items-start">
    <!-- Left column: ingredient list (primary) -->
    <div class="flex flex-col gap-3 md:flex-1">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold md:text-lg">
          {{ $t("recipe.ingredients") }}
        </h2>
        <UButton
          v-if="onUncheckAllFn && anyChecked"
          :label="$ts('actions.uncheckAll')"
          color="neutral"
          variant="soft"
          size="sm"
          @click="onUncheckAllFn()"
        />
      </div>
      <IngredientList
        v-if="ingredients.length > 0"
        :ingredients="ingredients"
        :categories="categories"
        :is-checked-fn="isCheckedFn"
        :on-check-fn="onCheckFn"
      />
      <p v-else class="text-sm text-muted">
        {{ $ts("shoppingList.emptyList") }}
      </p>
      <UButton
        v-if="
          onClearListFn &&
          (recipeSelection.length > 0 || manualItems.length > 0)
        "
        :label="$ts('actions.clearList')"
        color="neutral"
        variant="soft"
        size="xs"
        icon="i-lucide-trash-2"
        class="mt-2 self-start"
        @click="onClearListFn()"
      />
    </div>

    <!-- Right column: selected recipes + free-hand items -->
    <div class="flex flex-col gap-4 md:w-2/5">
      <!-- Selected recipes -->
      <UCard
        :ui="{ root: 'bg-neutral-50 dark:bg-neutral-900', body: 'p-3 sm:p-4' }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">
              {{ $ts("shoppingList.selectedRecipes") }}
            </h2>
            <UButton
              v-if="onClearRecipesFn && recipeSelection.length > 0"
              :label="$ts('actions.clearList')"
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              @click="onClearRecipesFn()"
            />
          </div>
        </template>
        <UTable
          :data="recipeSelection"
          :columns="columns"
          :ui="{ td: 'px-2 py-1.5', th: 'px-2 py-1.5 text-xs' }"
        />
      </UCard>

      <!-- Free-hand items -->
      <UCard
        :ui="{ root: 'bg-neutral-50 dark:bg-neutral-900', body: 'p-3 sm:p-4' }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">
              {{ $ts("shoppingList.freehandItems") }}
            </h2>
            <UButton
              v-if="onClearManualItemsFn && manualItems.length > 0"
              :label="$ts('actions.clearList')"
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              @click="onClearManualItemsFn()"
            />
          </div>
        </template>
        <ManualItemsList
          v-if="manualItems.length > 0"
          :items="manualItems"
          :on-delete-fn="onRemoveManualItemFn"
        />
        <p v-else class="text-sm text-muted">
          {{ $ts("shoppingList.emptyList") }}
        </p>
        <UForm
          v-if="onAddManualItemFn"
          ref="addItemForm"
          :schema="addItemSchema"
          :state="addItemState"
          class="mt-4 space-y-3"
          @submit="addManualIngredient"
        >
          <h3 class="text-xs font-semibold">
            {{ $t("shoppingList.addFreehand") }}
          </h3>
          <div class="grid grid-cols-5 items-end gap-2 md:flex md:flex-row">
            <UFormField
              name="name"
              :label="$ts('shoppingList.ingredientLabel')"
              class="col-span-2"
              :required="true"
            >
              <UInput v-model="addItemState.name" size="sm" />
            </UFormField>
            <UFormField
              name="quantity"
              :label="$ts('shoppingList.quantityLabel')"
            >
              <UInput
                v-model="addItemState.quantity"
                size="sm"
                class="md:w-14"
                :ui="{ root: 'w-full' }"
              />
            </UFormField>
            <UFormField name="unit" :label="$ts('shoppingList.unitLabel')">
              <UInput v-model="addItemState.unit" size="sm" class="md:w-14" />
            </UFormField>
            <UButton
              type="submit"
              size="sm"
              class="h-7 justify-center"
              :label="$ts('actions.add')"
            />
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

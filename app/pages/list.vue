<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { RecipeInfo } from "~~/shared/types";
import type { RecipeChoices } from "@tmlmt/cooklang-parser";

definePageMeta({
  title: "Shopping List",
  description:
    "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation",
});

const shoppingStore = useShoppingStore();
const shoppingList = await useShoppingList();
const ingredients = shoppingList.ingredients;
const toast = useToast();

const UButton = resolveComponent("UButton");
const ULink = resolveComponent("ULink");
const UInputNumber = resolveComponent("UInputNumber");
const UBadge = resolveComponent("UBadge");

// Per-row pending state to prevent duplicate in-flight requests
const pendingServings = ref<Record<string, boolean>>({});
const draftServings = ref<Record<string, number>>({});
const saveTimers = ref<Record<string, ReturnType<typeof setTimeout>>>({});

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

function choicesLabel(choices?: RecipeChoices): string | null {
  if (!choices) return null;
  const hasAlts =
    (choices.ingredientItems?.size ?? 0) > 0 ||
    (choices.ingredientGroups?.size ?? 0) > 0;
  if (choices.variant && hasAlts) return `${choices.variant} + custom`;
  if (choices.variant) return choices.variant;
  if (hasAlts) return "Custom choices";
  return null;
}

async function saveServings(
  path: string,
  value: number,
  choices?: RecipeChoices,
): Promise<void> {
  if (pendingServings.value[path]) return;
  pendingServings.value[path] = true;
  try {
    await shoppingStore.editServings(path, value, choices);
    const { [path]: _removed, ...rest } = draftServings.value;
    draftServings.value = rest;
  } catch {
    toast.add({
      color: "error",
      title: "Error",
      description: "Failed to update servings",
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

const columns: TableColumn<RecipeInfo>[] = [
  {
    accessorKey: "title",
    header: "Name",
    cell: ({ row }) => {
      return h(
        ULink,
        {
          to: {
            path: `/recipe/${row.original.path}`,
          },
        },
        () => row.getValue("title"),
      );
    },
  },
  {
    accessorKey: "servings",
    header: "Servings",
    meta: { class: { td: "w-32" } },
    cell: ({ row }) => {
      const path = row.original.path;
      const choices = row.original.choices;
      const step = servingsStepFrom(row.original.servings);
      const currentValue = draftServings.value[path] ?? row.original.servings;
      return h(UInputNumber, {
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
            const value = draftServings.value[path] ?? row.original.servings;
            void saveServings(path, value, choices);
          }
        },
      });
    },
  },
  {
    accessorKey: "choices",
    header: "Choices",
    cell: ({ row }) => {
      const label = choicesLabel(row.original.choices);
      if (!label) return "n/a";
      return h(UBadge, { color: "neutral", variant: "subtle" }, () => label);
    },
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return h(UButton, {
        icon: "prime:trash",
        color: "error",
        onClick: async () => {
          await shoppingStore.removeRecipe(row.original.path);
          toast.add({
            color: "success",
            title: "Success",
            description: "Recipe successfully removed from shopping list",
          });
        },
      });
    },
  },
];
</script>

<template>
  <div class="mt-4 flex w-full flex-col gap-4 px-4 md:mt-0 md:px-0">
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
    <UTable
      :data="shoppingStore.recipeSelection"
      :columns="columns"
      :ui="{ td: 'px-4 py-2 md:py-4' }"
    />
    <div v-if="ingredients && ingredients.length > 0">
      <h2 class="text-base font-bold md:text-lg">Ingredients</h2>
      <IngredientList class="mt-4" :ingredients="ingredients" />
    </div>
  </div>
</template>

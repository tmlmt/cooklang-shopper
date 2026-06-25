<script setup lang="ts">
import type { LocaleOption } from "~~/shared/types";

const RECIPE_DEFAULT = "__default__";

export type RecipeLocaleResult = {
  recipeLocale: string | undefined;
  pageLanguageMode: "recipe" | "app";
};

const props = defineProps<{
  allLocaleOptions: LocaleOption[];
  currentRecipeLocale: string | undefined;
  currentAppLocale: string;
  defaultRecipeLocale: string | undefined;
}>();

const emit = defineEmits<{ close: [result: RecipeLocaleResult | undefined] }>();

const { $ts } = useI18n();
const { $getLocales } = useNuxtApp();

const localeDisplayNames = computed(() => {
  const locales = $getLocales();
  return Object.fromEntries(
    locales.map((l) => [l.code, l.displayName ?? l.code.toUpperCase()]),
  );
});

const selectedKey = ref<string>(props.currentRecipeLocale ?? RECIPE_DEFAULT);
const pageLanguageModeCookie = useRecipePageLanguageMode();
const pageLanguageMode = ref<"recipe" | "app">(pageLanguageModeCookie.value);

const displayNames = computed(
  () => new Intl.DisplayNames([props.currentAppLocale], { type: "language" }),
);

function localeLabel(code: string) {
  return (
    localeDisplayNames.value[code] ??
    capitalize(displayNames.value.of(code)) ??
    code.toUpperCase()
  );
}

const selectItems = computed(() =>
  props.allLocaleOptions.map((opt) => {
    if (opt.code === undefined) {
      const label = props.defaultRecipeLocale
        ? localeLabel(props.defaultRecipeLocale)
        : $ts("basics.unspecified");
      return {
        label: `${label} (${$ts("basics.default")})`,
        value: RECIPE_DEFAULT,
      };
    }
    return {
      label: localeLabel(opt.code),
      value: opt.code,
    };
  }),
);

const pageModeItems = computed(() => [
  {
    label: $ts("recipeLocale.sameAsRecipe"),
    description: $ts("recipeLocale.sameAsRecipeDescription"),
    value: "recipe",
  },
  {
    label: $ts("recipeLocale.followApp"),
    description: $ts("recipeLocale.followAppDescription", {
      locale: props.currentAppLocale.toUpperCase(),
    }),
    value: "app",
  },
]);

function onConfirm() {
  pageLanguageModeCookie.value = pageLanguageMode.value;
  emit("close", {
    recipeLocale:
      selectedKey.value === RECIPE_DEFAULT ? undefined : selectedKey.value,
    pageLanguageMode: pageLanguageMode.value,
  });
}

defineShortcuts({ escape: () => emit("close", undefined) });
</script>

<template>
  <UModal
    :title="$ts('recipeLocale.modalTitle')"
    @close="emit('close', undefined)"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <UFormField :label="$ts('recipeLocale.recipeLanguageLabel')">
          <USelect
            v-model="selectedKey"
            :items="selectItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$ts('recipeLocale.pageLanguageLabel')">
          <URadioGroup
            v-model="pageLanguageMode"
            :items="pageModeItems"
            value-key="value"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          :label="$ts('actions.cancel')"
          @click="emit('close', undefined)"
        />
        <UButton :label="$ts('actions.confirm')" @click="onConfirm" />
      </div>
    </template>
  </UModal>
</template>

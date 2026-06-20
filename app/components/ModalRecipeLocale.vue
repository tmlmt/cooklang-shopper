<script setup lang="ts">
const RECIPE_DEFAULT = "__default__";

export type RecipeLocaleResult = {
  recipeLocale: string | undefined;
  pageLanguageMode: "recipe" | "app";
};

const props = defineProps<{
  allLocaleOptions: { code: string | undefined; label: string }[];
  currentRecipeLocale: string | undefined;
  currentAppLocale: string;
}>();

const emit = defineEmits<{ close: [result: RecipeLocaleResult | undefined] }>();

const { $ts } = useI18n();
const { $getLocales } = useNuxtApp();

const localeDisplayNames = computed(() => {
  const locales = $getLocales() as Array<{ code: string; displayName?: string }>;
  return Object.fromEntries(locales.map((l) => [l.code, l.displayName ?? l.code.toUpperCase()]));
});

const selectedKey = ref<string>(props.currentRecipeLocale ?? RECIPE_DEFAULT);
const pageLanguageModeCookie = useCookie<"recipe" | "app">(
  "ui:recipe:page-language-mode",
  { default: () => "app", maxAge: 60 * 60 * 24 * 365 },
);
const pageLanguageMode = ref<"recipe" | "app">(pageLanguageModeCookie.value);

const displayNames = computed(
  () => new Intl.DisplayNames([props.currentAppLocale], { type: "language" }),
);

const selectItems = computed(() =>
  props.allLocaleOptions.map((opt) => {
    if (opt.code === undefined) {
      // opt.label is either an uppercase locale code (e.g. "EN") or "default" when unknown
      const localeCode = opt.label !== "default" ? opt.label.toLowerCase() : undefined;
      const localeLabel = localeCode
        ? (localeDisplayNames.value[localeCode] ?? displayNames.value.of(localeCode) ?? localeCode.toUpperCase())
        : $ts("translation.unspecified");
      return { label: `${localeLabel} (${$ts("translation.default")})`, value: RECIPE_DEFAULT };
    }
    return {
      label: localeDisplayNames.value[opt.code] ?? displayNames.value.of(opt.code) ?? opt.code.toUpperCase(),
      value: opt.code,
    };
  }),
);

const pageModeItems = computed(() => [
  {
    label: $ts("recipeLocale.followRecipe"),
    description: $ts("recipeLocale.followRecipeDescription"),
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

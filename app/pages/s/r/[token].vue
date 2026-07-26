<script setup lang="ts">
import { Recipe, type RecipeChoices } from "@tmlmt/cooklang-parser";
import type { TranslationDict, IngredientOrder } from "~~/shared/types";

definePageMeta({
  layout: "shared",
});

const route = useRoute();
const token = route.params.token as string;

const { data, error } = await useFetch(`/api/sharing/recipe/resolve/${token}`);

if (error.value) {
  throw createError({
    status: error.value.status ?? 404,
    statusText:
      error.value.status === 410
        ? "This share link has expired"
        : "Share link not found",
  });
}

const rawRecipe = shallowRef(data.value?.raw ?? "");
const recipe = computed(() => new Recipe(rawRecipe.value));

const recipeName = computed(() => {
  if (!data.value) return "";
  const parts = data.value.recipePath.split(":");
  return parts[parts.length - 1];
});

const heroImages = computed(() => data.value?.imageManifest?.heroImages ?? []);

//---------------------------
// Language / locale
//---------------------------

const indexEntry = computed(() =>
  data.value
    ? {
        name: recipeName.value ?? "",
        title: String(recipe.value?.metadata.title || recipeName.value),
        dir: "",
        servings: 1,
        tags: [],
        locales: data.value.locales,
        defaultLocale: data.value.defaultLocale,
      }
    : undefined,
);

const {
  currentLocale,
  allLocaleOptions,
  isMultilingual,
  defaultLocale,
  setLocale,
} = useRecipeLanguage(indexEntry, data.value?.currentLocale);

const showLocaleSelector = computed(() => isMultilingual.value);

async function switchViewLocale(code: string | undefined) {
  if (code === currentLocale.value) return;
  const url = code
    ? `/api/sharing/recipe/resolve/${token}/raw?locale=${code}`
    : `/api/sharing/recipe/resolve/${token}/raw`;
  try {
    const raw = await $fetch<string>(url);
    rawRecipe.value = raw;
    setLocale(code);
  } catch {
    toast.add({
      color: "error",
      title: $ts("toast.error"),
      description: $ts("errors.recipeNotFound"),
    });
  }
}

//---------------------------
// OG Image
//---------------------------

const siteConfig = useSiteConfig();
const recipeMeta = recipe.value?.metadata as
  Record<string, unknown> | undefined;
const titleMeta = recipe.value?.metadata.title || recipeName;
const descriptionMeta =
  (recipeMeta?.description as string) ||
  (recipeMeta?.introduction as string) ||
  "";
defineOgImage("RecipeOgImage", {
  title: titleMeta,
  description: descriptionMeta,
  coverImage: heroImages.value[0] || "",
  baseUrl: (siteConfig.url || "").replace(/^https?:\/\//, ""),
});

//---------------------------
// Metadata
//---------------------------

useSeoMeta({
  title: titleMeta,
  ogTitle: titleMeta,
  description: descriptionMeta || siteConfig.description || "",
  ogDescription: descriptionMeta || siteConfig.description || "",
});

const stepImagesByNumber = computed(
  () => data.value?.imageManifest?.stepImagesByNumber ?? {},
);

const currentScaledRecipe = shallowRef<Recipe | undefined>(undefined);
const currentChoices = ref<RecipeChoices>({});

const modalCookMode = await useModalCookMode();
const modalRecipeLocale = await useModalRecipeLocale();

const toast = useToast();
const router = useRouter();
const {
  $t,
  $ts,
  $td,
  $_ts,
  $getLocale,
  $getLocales,
  $defaultLocale,
  $localePath,
  $loadPageTranslations,
} = useI18n();

const availableLocales = useAppLocaleCodes();

const recipeUiDicts = ref<Record<string, TranslationDict>>({});
const activeUiLocale = ref<string | undefined>(undefined);

const recipeUiRoute = computed(() => {
  const locale = activeUiLocale.value;
  if (!locale) return undefined;
  // Translations are loaded for the "recipe-path" route chunk. Resolve any
  // /recipe/ path so $_ts looks in that chunk rather than the share-page chunk.
  return router.resolve($localePath("/recipe/_", locale));
});

const recipeT: typeof $ts = (key, params, defaultValue) => {
  const uiRoute = recipeUiRoute.value;
  if (!uiRoute) return $ts(key, params, defaultValue);
  return $_ts(uiRoute as Parameters<typeof $_ts>[0])(key, params, defaultValue);
};
provide("recipeT", recipeT);

const effectiveRecipeLocale = computed(
  () => currentLocale.value ?? defaultLocale.value,
);
const ingredientDisplayLocale = computed(() =>
  $getLocales().find((l) => l.code === effectiveRecipeLocale.value),
);
provide(
  "ingredientOrder",
  computed(
    () =>
      (ingredientDisplayLocale.value?.ingredientOrder ??
        "quantity-first") as IngredientOrder,
  ),
);

async function applyRecipeUiLocale(
  targetUiLocale: string | undefined,
): Promise<boolean> {
  if (!targetUiLocale || !availableLocales.value.includes(targetUiLocale)) {
    activeUiLocale.value = undefined;
    return false;
  }
  let dict = recipeUiDicts.value[targetUiLocale];
  if (!dict) {
    let fetched: unknown;
    try {
      fetched = await $fetch(
        `/_locales/recipe-path/${targetUiLocale}/data.json`,
      );
    } catch {
      activeUiLocale.value = undefined;
      return false;
    }
    // A malformed payload (truncated body, HTML fallback, …) does not throw —
    // $fetch hands back the raw text — and activating it would make every label
    // render as its raw key. Stay on the app locale instead.
    if (!isRecipeTranslationDict(fetched)) {
      console.warn(
        `[i18n] Unusable translation payload for "${targetUiLocale}"; keeping page labels in the app locale.`,
      );
      activeUiLocale.value = undefined;
      return false;
    }
    dict = fetched;
    recipeUiDicts.value[targetUiLocale] = dict;
  }
  $loadPageTranslations(
    targetUiLocale,
    "recipe-path",
    dict as Parameters<typeof $loadPageTranslations>[2],
  );
  activeUiLocale.value = targetUiLocale;
  return true;
}

async function openLocaleModal() {
  const result = await modalRecipeLocale.open(
    allLocaleOptions.value,
    currentLocale.value,
    $getLocale(),
    defaultLocale.value,
  );
  if (!result) return;

  const { recipeLocale, pageLanguageMode } = result;

  await switchViewLocale(recipeLocale);

  if (pageLanguageMode === "app") {
    activeUiLocale.value = undefined;
    return;
  }

  const targetUiLocale =
    recipeLocale ?? defaultLocale.value ?? $defaultLocale();

  const applied = await applyRecipeUiLocale(targetUiLocale);

  if (
    !applied &&
    targetUiLocale &&
    !availableLocales.value.includes(targetUiLocale)
  ) {
    toast.add({
      color: "warning",
      title: $ts("recipeLocale.fallbackTitle"),
      description: $ts("recipeLocale.fallbackDescription", {
        locale: getLocaleDisplayName(
          targetUiLocale,
          $getLocale(),
          $getLocales(),
        ),
        fallback: getLocaleDisplayName(
          $getLocale(),
          $getLocale(),
          $getLocales(),
        ),
      }),
      duration: 3000,
    });
  }
}
const { setHeaderActions, setHeaderMenuItems } = useHeaderMenu();

setHeaderActions([
  {
    label: $ts("actions.cook"),
    icon: "i-lucide-cooking-pot",
    color: "secondary",
    variant: "soft",
    onSelect: () => {
      const r = currentScaledRecipe.value ?? recipe.value;
      if (!r) return;
      modalCookMode.open(r, currentChoices.value, stepImagesByNumber.value);
    },
  },
]);

setHeaderMenuItems([
  {
    label: $ts("actions.downloadCook"),
    icon: "i-lucide-download",
    onSelect: () => {
      downloadCook(rawRecipe.value, recipeName.value!);
    },
  },
]);
</script>

<template>
  <UContainer v-if="recipe" class="py-8">
    <div v-if="heroImages.length > 0" class="mb-3 md:mb-6">
      <UCarousel
        v-slot="{ item, index }"
        :items="heroImages"
        :arrows="heroImages.length > 1"
        :dots="heroImages.length > 1"
        :ui="{
          dots: 'bottom-4 md:-bottom-8',
          prev: 'sm:inset-s-8 cursor-pointer',
          next: 'sm:inset-e-8 cursor-pointer',
        }"
        loop
        class="w-full"
      >
        <NuxtImg
          :src="item"
          :alt="`${recipe.metadata.title ?? recipeName}${heroImages.length > 1 ? ` image ${index + 1}` : ''}`"
          sizes="640px md:768px lg:1024px xl:1280px 2xl:1536px"
          class="max-h-112 w-full rounded-sm object-cover"
        />
      </UCarousel>
    </div>

    <div class="mb-2 flex flex-col gap-4">
      <h1 class="flex items-center gap-2 text-2xl md:text-3xl font-bold">
        {{ recipe.metadata.title ?? recipeName }}
        <RecipeLanguageSelector
          v-if="showLocaleSelector"
          :current-locale="currentLocale"
          @open="openLocaleModal"
        />
      </h1>
    </div>

    <RecipeMetadataBlock :recipe="recipe" />

    <div v-if="data?.expiresAt" class="mt-2 text-sm text-amber-600">
      {{
        $t("sharedLinkExpires", {
          date: $td(new Date(data.expiresAt), {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }),
        })
      }}
    </div>

    <RecipeContent
      :recipe="recipe"
      :step-images-by-number="stepImagesByNumber"
      @update:scaled-recipe="(r) => (currentScaledRecipe = r)"
      @update:choices="(c) => (currentChoices = c)"
    />
  </UContainer>
</template>

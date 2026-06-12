<script setup lang="ts">
import { Recipe, type RecipeChoices } from "@tmlmt/cooklang-parser";

definePageMeta({
  layout: "shared",
  title: "Shared Recipe",
  description: "A recipe shared from Cooklang Shopper",
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

const recipe = computed(() =>
  data.value ? new Recipe(data.value.raw) : undefined,
);

const recipeName = computed(() => {
  if (!data.value) return "";
  const parts = data.value.recipePath.split(":");
  return parts[parts.length - 1];
});

const heroImages = computed(() => data.value?.imageManifest?.heroImages ?? []);

//---------------------------
// OG Image
//---------------------------

const siteConfig = useSiteConfig();
const recipeMeta = recipe.value?.metadata as
  | Record<string, unknown>
  | undefined;
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

const { $t, $ts } = useI18n();
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
      if (data.value?.raw) {
        downloadCook(data.value.raw, recipeName.value!);
      }
    },
  },
]);
</script>

<template>
  <UContainer v-if="recipe" class="py-8">
    <div v-if="heroImages.length > 0" class="md:mb-6">
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
      <h1 class="text-3xl font-bold">
        {{ recipe.metadata.title ?? recipeName }}
      </h1>
    </div>

    <RecipeMetadataBlock :recipe="recipe" />

    <div v-if="data?.expiresAt" class="mt-2 text-sm text-amber-600">
      {{ $t('sharedLinkExpires', { date: new Date(data.expiresAt).toLocaleDateString() }) }}
    </div>

    <RecipeContent
      :recipe="recipe"
      :step-images-by-number="stepImagesByNumber"
      @update:scaled-recipe="(r) => (currentScaledRecipe = r)"
      @update:choices="(c) => (currentChoices = c)"
    />
  </UContainer>
</template>

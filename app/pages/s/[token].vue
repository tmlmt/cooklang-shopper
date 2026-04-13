<script setup lang="ts">
import { Recipe } from "@tmlmt/cooklang-parser";

definePageMeta({
  layout: "shared",
  title: "Shared Recipe",
});

const route = useRoute();
const token = route.params.token as string;

const { data, error } = await useFetch(`/api/sharing/resolve/${token}`);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 404,
    statusMessage:
      error.value.statusCode === 410
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

const stepImagesByNumber = computed(
  () => data.value?.imageManifest?.stepImagesByNumber ?? {},
);
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
      This shared link expires on
      {{ new Date(data.expiresAt).toLocaleDateString() }}
    </div>

    <RecipeContent
      :recipe="recipe"
      :step-images-by-number="stepImagesByNumber"
    />
  </UContainer>
</template>

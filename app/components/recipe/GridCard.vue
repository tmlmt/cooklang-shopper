<script setup lang="ts">
import type { RecipeEssentials } from "~~/shared/types";
import RecipeTagOverflow from "~~/app/components/recipe/TagOverflow.vue";

const props = defineProps<{
  recipe: RecipeEssentials;
  selected: boolean;
  coverImage?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const { shoppingEnabled } = await useShoppingEnabled();

const isTouchDevice = ref(false);
const isImageActive = ref(false);
const imageWrapRef = ref<HTMLElement | null>(null);

const handleOutsideTap = (event: Event) => {
  if (!isTouchDevice.value || !isImageActive.value) return;

  const target = event.target as Node | null;
  if (target && imageWrapRef.value?.contains(target)) return;

  isImageActive.value = false;

  // First outside tap closes selection mode on mobile without triggering
  // accidental navigation on underlying tappable elements.
  event.preventDefault();
  event.stopPropagation();
};

onMounted(() => {
  isTouchDevice.value = window.matchMedia(
    "(hover: none), (pointer: coarse)",
  ).matches;
  document.addEventListener("pointerdown", handleOutsideTap, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsideTap, true);
});

const setImageHoverState = (active: boolean) => {
  if (isTouchDevice.value || !shoppingEnabled.value) return;
  isImageActive.value = active;
};

const handleImageTap = (event: MouseEvent) => {
  if (!isTouchDevice.value || !shoppingEnabled.value) return;
  if (!isImageActive.value) {
    event.preventDefault();
    isImageActive.value = true;
  }
  // When already flipped, let the NuxtLink navigate naturally
};

const recipePath = computed(() =>
  props.recipe.dir
    ? `/recipe/${props.recipe.dir}/${props.recipe.name}`
    : `/recipe/${props.recipe.name}`,
);

const gradientVariants = [
  "from-primary/40 to-secondary/25 dark:from-primary/48 dark:to-secondary/36",

  "from-warning/38 to-teal-500/28 dark:from-warning/46 dark:to-teal/36",
  "from-rose-400/30 to-primary/28 dark:from-rose-400/38 dark:to-primary/36",
  "from-error/32 to-warning/35 dark:from-error/40 dark:to-warning/42",
];

const gradientClass = computed(() => {
  const seed = props.recipe.name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradientVariants[seed % gradientVariants.length];
});

const preferredTime = computed(() => {
  const times = props.recipe.times;
  if (!times) return undefined;
  const value = times.total ?? times.cook ?? times.prep;
  if (value === undefined) return undefined;
  return formatTime(value);
});

const formattedModified = computed(() => {
  if (!props.recipe.lastModified) return "-";

  const modified = new Date(props.recipe.lastModified);
  if (Number.isNaN(modified.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - modified.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / oneDay);

  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;

  const month = String(modified.getMonth() + 1).padStart(2, "0");
  const day = String(modified.getDate()).padStart(2, "0");
  const year = modified.getFullYear();
  return `${month}-${day}-${year}`;
});
</script>

<template>
  <UCard class="group overflow-hidden">
    <div
      ref="imageWrapRef"
      class="relative mb-3"
      @mouseenter="setImageHoverState(true)"
      @mouseleave="setImageHoverState(false)"
    >
      <NuxtLink :to="recipePath" class="block" @click.stop="handleImageTap">
        <div class="h-28 overflow-hidden rounded-xl">
          <NuxtImg
            v-if="coverImage"
            v-slot="{ src, isLoaded, imgAttrs }"
            :src="coverImage"
            :alt="recipe.title"
            sizes="320px md:256px lg:341px xl:427px 2xl:512px"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-300 ease-out transform-3d"
            :class="isImageActive ? 'transform-[rotateY(180deg)]' : ''"
            :custom="true"
          >
            <!-- Show the actual image when loaded -->
            <img v-if="isLoaded" v-bind="imgAttrs" :src="src" />

            <!-- Show a placeholder while loading -->
            <USkeleton v-else class="h-full w-full" />
          </NuxtImg>

          <USkeleton v-else-if="loading" class="h-28 w-full rounded-xl" />
          <div
            v-else
            class="h-28 rounded-xl bg-linear-to-br transition-transform duration-300 ease-out transform-3d"
            :class="[
              gradientClass,
              isImageActive ? 'transform-[rotateY(180deg)]' : '',
            ]"
          >
            <div
              class="bg-default/25 flex h-full items-center justify-center rounded-xl"
            >
              <div
                class="bg-default/80 text-primary flex h-10 w-10 items-center justify-center rounded-md backdrop-blur-sm"
              >
                <Icon name="material-symbols:hand-meal" size="1.4em" />
              </div>
            </div>
          </div>
        </div>
      </NuxtLink>
      <UCheckbox
        class="bg-default/90 absolute top-3 right-3 z-10 rounded transition-all duration-200"
        :class="
          isImageActive
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0'
        "
        :model-value="selected"
        aria-label="Select recipe"
        :ui="{ container: 'h-4' }"
        @click.stop
        @update:model-value="emit('toggle')"
      />
    </div>

    <NuxtLink :to="recipePath" class="line-clamp-2 font-semibold">
      {{ recipe.title }}
    </NuxtLink>

    <div class="mt-2 flex min-h-6 flex-wrap items-center gap-1">
      <RecipeTagOverflow :tags="recipe.tags" mode="grid" />
      <UBadge v-if="preferredTime" color="neutral" variant="subtle">
        <template #leading>
          <Icon name="prime:clock" />
        </template>
        {{ preferredTime }}
      </UBadge>
      <span class="text-muted text-xs">{{ formattedModified }}</span>
    </div>
  </UCard>
</template>

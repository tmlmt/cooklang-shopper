<script setup lang="ts">
import type { MetadataTime } from "@tmlmt/cooklang-parser";

const { time } = defineProps<{
  time: MetadataTime | undefined;
}>();

const hasAnyTime = computed(
  () => time && (time.prep || time.cook || time.total),
);
</script>

<template>
  <div
    v-if="hasAnyTime"
    class="my-5 grid w-full grid-cols-3 justify-self-center rounded-lg border border-neutral-400 md:w-fit md:justify-self-start dark:border-neutral-600"
  >
    <div class="px-4 py-1 text-center text-xs text-neutral-500 uppercase">
      Prep
    </div>
    <div
      class="border-l border-neutral-400 px-4 py-1 text-center text-xs text-neutral-500 uppercase dark:border-neutral-600"
    >
      Cook
    </div>
    <div
      class="border-l border-neutral-400 px-4 py-1 text-center text-xs text-neutral-500 uppercase dark:border-neutral-600"
    >
      Total
    </div>
    <div class="px-4 py-1 text-center text-sm font-bold">
      {{ formatTime(time?.prep) }}
    </div>
    <div
      class="border-l border-neutral-400 px-4 py-1 text-center text-sm font-bold dark:border-neutral-600"
    >
      {{ formatTime(time?.cook) }}
    </div>
    <div
      class="border-l border-neutral-400 px-4 py-1 text-center text-sm font-bold text-orange-600 dark:border-neutral-600 dark:text-orange-400"
    >
      {{ formatTime(time?.total) }}
    </div>
  </div>
</template>

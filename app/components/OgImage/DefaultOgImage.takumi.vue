<script setup lang="ts">
const {
  title = "My Page",
  subtitle = "",
  description = "",
} = defineProps<{
  title?: string;
  subtitle?: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex h-full w-full flex-col items-center p-[60px] text-white"
    style="background-image: linear-gradient(to bottom right, #2563eb, #ffb86a)"
  >
    <NuxtImg src="/chef-rounded-hat-white.svg" width="100" height="100" />
    <div class="flex flex-1 flex-col items-center justify-center">
      <h1 class="m-0 text-center text-[72px] leading-tight font-bold text-wrap">
        {{ title }}
      </h1>
      <h2 v-if="subtitle" class="mt-2 text-center text-[48px] opacity-75">
        {{ subtitle }}
      </h2>
      <p
        v-if="description"
        class="mt-4 max-w-[900px] text-center text-[32px] opacity-75"
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>

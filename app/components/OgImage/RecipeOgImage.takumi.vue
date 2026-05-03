<script setup lang="ts">
const {
  title = "Recipe",
  description = "",
  coverImage = "",
  baseUrl = "",
} = defineProps<{
  title?: string;
  description?: string;
  coverImage?: string;
  baseUrl?: string;
}>();

const truncatedDescription =
  description.length > 200 ? description.slice(0, 197) + "…" : description;
</script>

<template>
  <div class="flex h-full w-full flex-col" style="overflow: hidden">
    <!-- Top: recipe cover image or fallback gradient (360px) -->
    <div
      v-if="coverImage"
      :style="{
        backgroundImage: `url(${coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }"
      class="h-[360px] w-full shrink-0"
    />
    <div
      v-else
      class="flex h-[360px] w-full shrink-0 items-center justify-center text-white"
      style="
        background-image: linear-gradient(to bottom right, #2563eb, #ffb86a);
      "
    >
      <NuxtImg src="/chef-rounded-hat-white.svg" width="100" height="100" />
    </div>
    <!-- Bottom: text panel (240px) -->
    <div
      class="flex flex-col justify-center"
      style="
        height: 240px;
        flex-shrink: 0;
        background-color: #ffffff;
        padding: 28px 60px;
        gap: 10px;
        overflow: hidden;
      "
    >
      <p class="m-0 text-[22px] font-medium" style="color: #9ca3af">
        {{ baseUrl }}
      </p>
      <h1
        class="m-0 w-full text-[50px] leading-tight font-bold"
        style="color: #111827"
      >
        {{ title }}
      </h1>
      <p
        v-if="truncatedDescription"
        class="m-0 text-[24px] leading-snug"
        style="color: #6b7280"
      >
        {{ truncatedDescription }}
      </p>
    </div>
  </div>
</template>

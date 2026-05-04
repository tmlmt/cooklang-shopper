<script setup lang="ts">
const {
  title = "Recipe",
  description = "",
  coverImage = "",
  baseUrl = "",
  canvasWidth = 1200,
  canvasHeight = 600,
} = defineProps<{
  title?: string;
  description?: string;
  coverImage?: string;
  baseUrl?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}>();

const truncatedDescription =
  description.length > 200 ? description.slice(0, 197) + "…" : description;

const coverImageWidth = canvasWidth;
const coverImageHeight = Math.round(canvasHeight * 0.6);
</script>

<template>
  <div class="flex h-full w-full flex-col" style="overflow: hidden">
    <!-- Top: recipe cover image or fallback gradient (60% of canvas height) -->
    <div
      v-if="coverImage"
      class="h-[60%] w-full shrink-0"
      style="position: relative; overflow: hidden"
    >
      <NuxtImg
        :src="coverImage"
        :width="coverImageWidth"
        :height="coverImageHeight"
        style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        "
      />
    </div>
    <div
      v-else
      class="flex h-[60%] w-full shrink-0 items-center justify-center text-white"
      style="
        background-image: linear-gradient(to bottom right, #2563eb, #ffb86a);
      "
    >
      <NuxtImg src="/chef-rounded-hat-white.svg" width="100" height="100" />
    </div>
    <!-- Bottom: text panel (40% of canvas height) -->
    <div
      class="flex flex-col justify-center"
      style="
        height: 40%;
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

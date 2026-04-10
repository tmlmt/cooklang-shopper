<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: "en",
  },
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right', duration: 1600 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

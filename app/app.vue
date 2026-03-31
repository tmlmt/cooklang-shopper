<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: "en",
  },
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

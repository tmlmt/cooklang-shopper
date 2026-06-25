<script setup lang="ts">
const { title: appTitle, sharing } = await usePublicConfig();
useHead({
  htmlAttrs: {
    lang: "en",
  },
  titleTemplate: (pageTitle) =>
    pageTitle ? `${appTitle.value} | ${pageTitle}` : appTitle.value,
  link: computed(() =>
    sharing.value.federationEnabled
      ? [
          {
            rel: "alternate",
            type: "application/atom+xml",
            title: "Recipe Feed",
            href: "/feed.xml",
          },
        ]
      : [],
  ),
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right', duration: 1600 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

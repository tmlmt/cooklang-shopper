<script setup lang="ts">
const { sharing, title: appTitle } = await usePublicConfig();
const route = useRoute();

const defaultDescription =
  "Cooklang-style recipe management and shopping list creation with automated online shopping cart generation";

useHead({
  htmlAttrs: {
    lang: "en",
  },
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

useSeoMeta({
  author: "Thomas Lamant",
  title: () =>
    (route.meta.title as string)
      ? `${appTitle.value} - ${route.meta.title}`
      : appTitle.value,
  ogTitle: () =>
    (route.meta.title as string)
      ? `${appTitle.value} - ${route.meta.title}`
      : appTitle.value,
  description: () => (route.meta.description as string) || defaultDescription,
  ogDescription: () => (route.meta.description as string) || defaultDescription,
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right', duration: 1600 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

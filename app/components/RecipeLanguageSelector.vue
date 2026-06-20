<script setup lang="ts">
defineProps<{
  currentLocale: string | undefined;
}>();

const emit = defineEmits<{ open: [] }>();
</script>

<template>
  <UButton
    icon="material-symbols:language-japanese-kana"
    variant="ghost"
    color="neutral"
    size="lg"
    :aria-label="currentLocale ? currentLocale.toUpperCase() : 'Language'"
    @click="emit('open')"
  />
</template>

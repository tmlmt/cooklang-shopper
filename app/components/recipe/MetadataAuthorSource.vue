<script setup lang="ts">
import type { MetadataSource } from "@tmlmt/cooklang-parser";
import { urlRegex } from "#shared/regex";

const { source, author } = defineProps<{
  source: string | MetadataSource | undefined;
  /** The author of the recipe (separate from source author). */
  author: string | undefined;
}>();

const sourceURL = computed(() => {
  if (!source) return undefined;
  const sourceToCheck = typeof source === "string" ? source : source.url;
  if (!sourceToCheck) return undefined;
  if (urlRegex.test(sourceToCheck.trim())) {
    return sourceToCheck.trim();
  }
  return undefined;
});

const sourceWebsite = computed(() => {
  if (!sourceURL.value) return undefined;
  const urlMatch = sourceURL.value.match(urlRegex);
  if (urlMatch?.groups) {
    return urlMatch.groups.shortdomain;
  }
  return sourceURL.value;
});

const sourceText = computed(() => {
  if (!source) return undefined;
  if (typeof source === "string") {
    return sourceWebsite.value ? undefined : source;
  }
  if (source.author && source.name) return `${source.name} (${source.author})`;
  return source.author ?? source.name ?? sourceWebsite.value;
});
</script>

<template>
  <p v-if="source || author" class="text-sm">
    <template v-if="author">
      by <b>{{ author }}</b>
    </template>
    <template v-if="source && author"> • </template>
    <template v-if="source">
      from
      <b v-if="sourceText">{{ sourceText }}</b>
      <ULink
        v-if="sourceWebsite"
        :to="sourceURL?.trim()"
        target="_blank"
        class="font-bold"
        ><UBadge
          leading-icon="prime:link"
          color="secondary"
          variant="soft"
          size="sm"
          class="ml-1 translate-y-px rounded-full"
          >{{ sourceWebsite }}</UBadge
        ></ULink
      >
    </template>
  </p>
</template>

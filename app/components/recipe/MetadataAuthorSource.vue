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
  <div v-if="source || author" class="flex flex-row items-center gap-1 text-sm">
    <div v-if="author">
      by <b>{{ author }}</b>
    </div>
    <div v-if="source && author">•</div>
    <div v-if="source" class="flex flex-row items-center gap-1">
      from
      <p v-if="sourceText" class="font-bold">{{ sourceText }}</p>
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
          class="mt-0.5 ml-1 rounded-full"
          >{{ sourceWebsite }}</UBadge
        ></ULink
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FolderInfo } from "~~/app/composables/useDirectoryContents";

const props = defineProps<{
  folder: FolderInfo;
  compact?: boolean;
}>();

const to = computed(() => `/browse/${props.folder.path}`);
</script>

<template>
  <NuxtLink :to="to" class="block">
    <UCard class="group transition hover:-translate-y-0.5 hover:shadow-md">
      <div class="flex items-start gap-3">
        <div
          class="bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        >
          <Icon name="material-symbols:folder-outline-rounded" size="1.2em" />
        </div>
        <div class="min-w-0">
          <div class="truncate font-semibold">{{ folder.name }}</div>
          <div class="text-muted text-sm">
            <template v-if="folder.subdirCount > 0">
              {{ $tc('folder.subfolders', folder.subdirCount) }} ·
            </template>
            {{ $tc('folder.recipes', folder.recipeCount) }}
          </div>
          <div v-if="!compact" class="text-muted mt-1 text-xs">
            Yield {{ folder.servingsSummary }} · {{ folder.authorSummary }} ·
            {{ folder.sourceSummary }}
          </div>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>

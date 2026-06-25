<script setup lang="ts">
import type { FolderInfo } from "~~/app/composables/useDirectoryContents";

const props = defineProps<{
  folder: FolderInfo;
  compact?: boolean;
}>();

const { $tc } = useI18n();
</script>

<template>
  <i18n-link :to="`/browse/${props.folder.path}`" class="block">
    <UCard class="group transition hover:-translate-y-0.5 hover:shadow-md">
      <div class="flex items-start gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
        >
          <Icon name="material-symbols:folder-outline-rounded" size="1.2em" />
        </div>
        <div class="min-w-0">
          <div class="truncate font-semibold">{{ folder.name }}</div>
          <div class="text-sm text-muted">
            <template v-if="folder.subdirCount > 0">
              {{ $tc("folder.subfolders", props.folder.subdirCount) }} ·
            </template>
            {{ $tc("folder.recipes", props.folder.recipeCount) }}
          </div>
          <div v-if="!compact" class="mt-1 text-xs text-muted">
            Yield {{ folder.servingsSummary }} · {{ folder.authorSummary }} ·
            {{ folder.sourceSummary }}
          </div>
        </div>
      </div>
    </UCard>
  </i18n-link>
</template>

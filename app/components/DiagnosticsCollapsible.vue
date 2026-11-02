<script setup lang="ts">
import type { Diagnostic } from "@tmlmt/cooklang-parser";

const props = defineProps<{
  diagnostics: Diagnostic[];
  source: string;
}>();

const open = ref(false);
const { summary } = useDiagnosticsSummary(toRef(props, "diagnostics"));
</script>

<template>
  <UCollapsible v-if="diagnostics.length > 0" v-model:open="open">
    <UButton
      class="group w-full"
      :color="summary.color"
      variant="soft"
      size="sm"
    >
      <div class="flex w-full flex-row">
        <span class="grow text-left">{{ summary.label }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </div>
    </UButton>
    <template #content>
      <div class="mt-3 flex flex-col gap-3">
        <DiagnosticCard
          v-for="(diagnostic, index) in diagnostics"
          :key="index"
          :diagnostic="diagnostic"
          :raw-recipe="source"
        />
      </div>
    </template>
  </UCollapsible>
  <p v-else class="text-sm" :class="`text-${summary.color}`">
    {{ summary.label }}
  </p>
</template>

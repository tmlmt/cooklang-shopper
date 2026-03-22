<script setup lang="ts">
import type { FixedValue, Range } from "@tmlmt/cooklang-parser";
import { formatQuantityWithUnit } from "@tmlmt/cooklang-parser";

const props = defineProps<{
  quantity?: FixedValue | Range;
  unit?: string;
}>();

const displayText = computed(() => {
  return formatQuantityWithUnit(props.quantity, props.unit);
});
</script>

<template>
  <span class="quantity">{{ displayText }}</span>
</template>

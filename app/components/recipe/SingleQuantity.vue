<script setup lang="ts">
import type { FixedValue, Range, Unit } from "@tmlmt/cooklang-parser";
import { formatQuantityWithUnit } from "@tmlmt/cooklang-parser";

const props = defineProps<{
  quantity?: FixedValue | Range;
  unit?: string | Unit;
}>();

const displayText = computed(() => {
  return formatQuantityWithUnit(props.quantity, props.unit);
});
</script>

<template>
  <span>{{ displayText }}</span>
</template>

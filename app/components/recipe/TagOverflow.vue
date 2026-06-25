<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tags: string[];
    maxVisible?: number;
    mode?: "list" | "grid";
  }>(),
  {
    maxVisible: 2,
    mode: "grid",
  },
);

const visibleTags = computed(() => props.tags.slice(0, props.maxVisible));
const hiddenTags = computed(() => props.tags.slice(props.maxVisible));
const hiddenCount = computed(() => hiddenTags.value.length);

const badgeClass = computed(() =>
  props.mode === "list"
    ? "max-w-28 truncate rounded-full"
    : "max-w-32 truncate rounded-full",
);

const { $t } = useI18n();
</script>

<template>
  <div
    v-if="tags.length > 0"
    class="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden"
  >
    <UBadge
      v-for="tag in visibleTags"
      :key="tag"
      color="neutral"
      variant="soft"
      :class="badgeClass"
    >
      {{ tag }}
    </UBadge>

    <UPopover v-if="hiddenCount > 0" mode="hover">
      <UBadge
        color="neutral"
        variant="subtle"
        class="shrink-0 rounded-full"
        :title="hiddenTags.join(', ')"
      >
        +{{ hiddenCount }}
      </UBadge>

      <template #content>
        <div class="max-w-64 p-2">
          <div class="mb-1 text-xs text-muted">
            {{ $t("recipeTags.extraTags") }}
          </div>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="tag in hiddenTags"
              :key="tag"
              color="neutral"
              variant="soft"
              class="rounded-full"
            >
              {{ tag }}
            </UBadge>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>

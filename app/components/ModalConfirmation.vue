<script setup lang="ts">
const props = defineProps<{
  question: string;
  yes?: string;
  no?: string;
}>();

const { $ts } = useI18n();
const yes = props.yes ?? capitalize($ts("basics.yes"));
const no = props.no ?? capitalize($ts("basics.no"));
const { question } = props;

const emit = defineEmits<{ close: [boolean] }>();

defineShortcuts({
  escape: () => emit("close", false),
});
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }" :title="question">
    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="no"
          @click="emit('close', false)"
        />
        <UButton color="primary" :label="yes" @click="emit('close', true)" />
      </div>
    </template>
  </UModal>
</template>

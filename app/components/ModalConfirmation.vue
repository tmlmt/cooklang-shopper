<script setup lang="ts">
const {
  question,
  yes = "Yes",
  no = "No",
} = defineProps<{
  question: string;
  yes?: string;
  no?: string;
}>();
const emit = defineEmits<{ close: [boolean] }>();
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

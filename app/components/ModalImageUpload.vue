<script setup lang="ts">
const { roles } = defineProps<{
  roles: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  close: [{ file: File; role: string } | false];
}>();

defineShortcuts({
  escape: () => emit("close", false),
});

const { $ts } = useI18n();

const selectedRole = ref(roles[0]?.value ?? "cover");
const selectedFile = ref<File | null>(null);

function onFileChange(file: File | null | undefined) {
  selectedFile.value = file ?? null;
}
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="$ts('actions.uploadImage')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="$ts('modal.imageUpload.imageRole')">
          <USelect
            v-model="selectedRole"
            :items="roles"
            class="w-full"
            size="sm"
          />
        </UFormField>
        <UFormField :label="$ts('modal.imageUpload.imageFile')">
          <UFileUpload
            accept="image/*"
            class="min-h-64 w-full"
            reset
            @update:model-value="onFileChange"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="$ts('actions.cancel')"
          @click="emit('close', false)"
        />
        <UButton
          color="primary"
          :label="$ts('actions.upload')"
          :disabled="!selectedFile"
          @click="emit('close', { file: selectedFile!, role: selectedRole })"
        />
      </div>
    </template>
  </UModal>
</template>

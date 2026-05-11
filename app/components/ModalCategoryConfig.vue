<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();

defineShortcuts({
  escape: () => emit("close"),
});

const { data } = await useFetch("/api/category-config");
const savedContent = ref(data.value?.content ?? "");
const content = ref(savedContent.value);

const isDirty = computed(() => content.value !== savedContent.value);

const toast = useToast();
const saving = ref(false);

async function save() {
  saving.value = true;
  try {
    await $fetchWithHeaders("/api/category-config", {
      method: "PUT",
      body: { content: content.value },
    });
    toast.add({ color: "success", title: "Category config saved" });
    savedContent.value = content.value;
    emit("close");
  } catch (e: unknown) {
    const message = (e as { data?: { message?: string } })?.data?.message;
    toast.add({
      color: "error",
      title: "Invalid category config",
      description: message,
    });
  } finally {
    saving.value = false;
  }
}

const fileInput = ref<HTMLInputElement | null>(null);

function triggerImport() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    content.value = reader.result as string;
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = "";
}
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    title="Category Configuration"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UTextarea
          v-model="content"
          :rows="16"
          :ui="{ base: 'font-mono' }"
          :placeholder="'[Dairy]\nmilk\nbutter\n\n[Bakery]\nflour\nsugar'"
          autoresize
        />
        <div class="flex gap-2">
          <UButton
            color="primary"
            label="Save"
            icon="material-symbols:save"
            :loading="saving"
            :disabled="!isDirty"
            @click="save"
          />
          <UButton
            color="neutral"
            variant="soft"
            label="Import from file"
            icon="material-symbols:upload-file"
            @click="triggerImport"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".conf,.toml,text/*"
            class="hidden"
            @change="onFileChange"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

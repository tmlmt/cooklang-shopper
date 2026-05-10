<script setup lang="ts">
definePageMeta({
  title: "Pantry",
});

const { data } = await useFetch("/api/pantry");
const savedContent = ref(data.value?.content ?? "");
const content = ref(savedContent.value);

const isDirty = computed(() => content.value !== savedContent.value);

const toast = useToast();
const saving = ref(false);

async function save() {
  saving.value = true;
  try {
    await $fetchWithHeaders("/api/pantry", {
      method: "PUT",
      body: { content: content.value },
    });
    toast.add({ color: "success", title: "Pantry saved" });
    savedContent.value = content.value;
  } catch (e: unknown) {
    const message = (e as { data?: { message?: string } })?.data?.message;
    toast.add({
      color: "error",
      title: "Invalid pantry",
      description: message,
      duration: 5000,
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
  // Reset so the same file can be re-imported if needed
  (e.target as HTMLInputElement).value = "";
}
</script>

<template>
  <div class="flex w-full flex-col gap-4 p-4">
    <UTextarea
      v-model="content"
      :rows="20"
      :ui="{ base: 'font-mono' }"
      placeholder='# TOML Pantry Format&#10;See https://cooklang.org/docs/use-cases/pantry/#the-pantry-configuration-file&#10;&#10;[fridge]&#10;milk = { expire = "10.05.2024", quantity = "1%L" }&#10;&#10;[freezer]&#10;spinach = { quantity = "1%kg", low = "200%g" }'
      autoresize
    />
    <div class="flex gap-2">
      <UButton
        color="primary"
        label="Save"
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

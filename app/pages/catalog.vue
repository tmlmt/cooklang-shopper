<script setup lang="ts">
import type { FetchError } from "ofetch";

const { $ts } = useI18n();

useSeoMeta({
  title: $ts("pages.productCatalog"),
});

const catalogStore = useCatalogStore();

const { data } = await useFetch("/api/catalog");
const savedContent = ref(data.value?.content ?? "");
const content = ref(savedContent.value);

const isDirty = computed(() => content.value !== savedContent.value);

const toast = useToast();
const saving = ref(false);

type CatalogSaveErrorData = { message?: string };

async function save() {
  saving.value = true;
  try {
    await catalogStore.saveCatalog(content.value);
    toast.add({ color: "success", title: $ts("toast.catalogSaved") });
    savedContent.value = content.value;
  } catch (error: unknown) {
    const fetchError = error as FetchError<CatalogSaveErrorData>;
    const connectionError = isFetchConnectionError(error);
    const message = fetchError.data?.message;
    toast.add({
      color: "error",
      title: $ts(
        connectionError ? "errors.connectionError" : "errors.catalogInvalid",
      ),
      description: connectionError ? undefined : message,
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
      :placeholder="$ts('placeholder')"
      autoresize
    />
    <div class="flex gap-2">
      <UButton
        color="primary"
        :label="$ts('actions.save')"
        :loading="saving"
        :disabled="!isDirty"
        @click="save"
      />
      <UButton
        color="neutral"
        variant="soft"
        :label="$ts('actions.importFromFile')"
        icon="material-symbols:upload-file"
        @click="triggerImport"
      />
      <input
        ref="fileInput"
        type="file"
        accept=".toml,text/*"
        class="hidden"
        @change="onFileChange"
      />
    </div>
  </div>
</template>

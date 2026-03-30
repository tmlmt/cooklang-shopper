<script setup lang="ts">
const { data: versionInfo } = useFetch("/api/latest-version");

defineShortcuts({
  escape: () => emit("close", true),
});

const emit = defineEmits<{ close: [boolean] }>();
</script>

<template>
  <UModal
    title="About Cooklang Shopper"
    :close="false"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <div class="grid grid-cols-3 items-center gap-2 p-2">
        <div class="text-right font-bold">Author:</div>
        <p class="col-span-2">Thomas Lamant</p>
        <div class="text-right font-bold">Version:</div>
        <div class="col-span-2 flex items-center gap-2">
          <span>{{ versionInfo?.currentVersion }}</span>
          <a
            v-if="versionInfo?.updateAvailable"
            :href="`https://github.com/tmlmt/cooklang-shopper/releases/tag/v${versionInfo.latestVersion}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary flex items-center gap-1 text-sm"
          >
            <Icon name="mdi:arrow-up-circle-outline" size="16" />
            Update available
          </a>
        </div>
        <div class="text-right font-bold">Code:</div>
        <div class="col-span-2 flex">
          <a
            href="https://github.com/tmlmt/cooklang-shopper"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center"
          >
            <Icon name="mdi:github" size="20" />
          </a>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="mx-auto flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          label="Close"
          @click="emit('close', true)"
        />
      </div>
    </template>
  </UModal>
</template>

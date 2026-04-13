<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>();

const { loggedIn } = useUserSession();

const versionInfo = loggedIn.value
  ? await $fetchWithHeaders<{
      currentVersion: string;
      latestVersion: string;
      updateAvailable: boolean;
    }>("/api/latest-version")
  : null;

defineShortcuts({
  escape: () => emit("close", true),
});

const { title: appTitle, sharing } = await usePublicConfig();

const about = computed(() => sharing.value.about);
</script>

<template>
  <UModal
    :title="`About ${appTitle}`"
    :close="false"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <!-- Authenticated: developer / admin info -->
      <div v-if="loggedIn" class="grid grid-cols-3 items-center gap-2 p-2">
        <div class="text-right font-bold">Author:</div>
        <p class="col-span-2">Thomas Lamant</p>
        <template v-if="versionInfo">
          <div class="text-right font-bold">Version:</div>
          <div class="col-span-2 flex items-center gap-2">
            <span>{{ versionInfo.currentVersion }}</span>
            <a
              v-if="versionInfo.updateAvailable"
              :href="`https://github.com/tmlmt/cooklang-shopper/releases/tag/v${versionInfo.latestVersion}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary flex items-center gap-1 text-sm"
            >
              <Icon name="mdi:arrow-up-circle-outline" size="16" />
              Update available
            </a>
          </div>
        </template>
        <div class="text-right font-bold">Code:</div>
        <div class="col-span-2 flex">
          <ULink
            to="https://github.com/tmlmt/cooklang-shopper"
            target="_blank"
            class="flex items-center"
          >
            <Icon name="mdi:github" size="20" />
          </ULink>
        </div>
      </div>

      <!-- Unauthenticated: public-facing cookbook info -->
      <div v-else class="flex flex-col gap-3 p-2">
        <div v-if="about?.author" class="flex items-center gap-2">
          <span class="font-bold">By:</span>
          <span>{{ about.author }}</span>
        </div>
        <p v-if="about?.description" class="text-muted text-sm">
          {{ about.description }}
        </p>
        <div v-if="about?.contact" class="flex items-center gap-2">
          <span class="font-bold">Contact:</span>
          <span>{{ about.contact }}</span>
        </div>
        <div
          v-if="!about?.author && !about?.description && !about?.contact"
          class="text-muted flex items-center justify-center gap-1"
        >
          Powered by
          <ULink
            to="https://github.com/tmlmt/cooklang-shopper"
            target="_blank"
            class="flex items-center"
          >
            <Icon name="mdi:github" size="20" />
            <span>Cooklang Shopper</span>
          </ULink>
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

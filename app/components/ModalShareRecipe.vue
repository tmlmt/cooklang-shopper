<script setup lang="ts">
import type { ShareLink } from "~~/shared/types";

const props = defineProps<{
  recipePath: string;
  /** Currently viewing locale (undefined = default file) */
  viewingLocale?: string;
}>();

const emit = defineEmits<{ close: [] }>();
const toast = useToast();
const { $ts } = useI18n();
const { isEditor } = useRole();
const { baseUrl } = await usePublicConfig();

// Visibility
const visibility = ref<"public" | "private">("private");
const loadingVisibility = ref(true);

// Share links
const links = ref<ShareLink[]>([]);
const loadingLinks = ref(true);

async function loadData(recipePath: string) {
  loadingVisibility.value = true;
  loadingLinks.value = true;

  try {
    const data = await $fetchWithHeaders<{ visibility: "public" | "private" }>(
      `/api/sharing/recipe/visibility/${recipePath}`,
    );
    visibility.value = data.visibility;
  } catch {
    // keep default
  } finally {
    loadingVisibility.value = false;
  }

  try {
    const data = await $fetchWithHeaders<ShareLink[]>(
      "/api/sharing/recipe/links",
      {
        query: { recipePath },
      },
    );
    links.value = data;
  } catch {
    // keep default
  } finally {
    loadingLinks.value = false;
  }
}

watch(() => props.recipePath, loadData, { immediate: true });

async function toggleVisibility() {
  const newVisibility = visibility.value === "public" ? "private" : "public";
  try {
    await $fetchWithHeaders(
      `/api/sharing/recipe/visibility/${props.recipePath}`,
      {
        method: "PUT",
        body: { visibility: newVisibility },
      },
    );
    visibility.value = newVisibility;
    toast.add({
      title: $ts("toast.visibilityUpdated"),
      description: $ts("toast.visibilityUpdatedTo", {
        visibility: newVisibility,
      }),
      color: "success",
    });
  } catch {
    toast.add({
      title: $ts("toast.error"),
      description: $ts("toast.visibilityUpdateError"),
      color: "error",
    });
  }
}

const { copy } = useClipboard({ legacy: true });
const creatingLink = ref(false);

async function createLink() {
  creatingLink.value = true;
  try {
    const data = await $fetchWithHeaders<Omit<ShareLink, "expired">>(
      "/api/sharing/recipe/links",
      {
        method: "POST",
        body: {
          recipePath: props.recipePath,
          locale: props.viewingLocale ?? undefined,
        },
      },
    );
    links.value.unshift({ ...data, expired: false });
    toast.add({
      title: $ts("toast.shareLinkCreated"),
      color: "success",
    });
  } catch {
    toast.add({
      title: $ts("toast.error"),
      description: $ts("toast.shareLinkCreateError"),
      color: "error",
    });
  } finally {
    creatingLink.value = false;
  }
}

async function revokeLink(id: number) {
  try {
    await $fetchWithHeaders(`/api/sharing/recipe/links/${id}`, {
      method: "DELETE",
    });
    links.value = links.value.filter((l) => l.id !== id);
    toast.add({
      title: $ts("toast.shareLinkRevoked"),
      color: "success",
    });
  } catch {
    toast.add({
      title: $ts("toast.error"),
      description: $ts("toast.shareLinkRevokeError"),
      color: "error",
    });
  }
}

function getShareUrl(token: string): string {
  return `${baseUrl.value}/s/r/${token}`;
}

async function copyLink(token: string) {
  try {
    await copy(getShareUrl(token));
    toast.add({
      title: $ts("toast.linkCopied"),
      color: "success",
    });
  } catch {
    toast.add({
      title: $ts("toast.error"),
      description: $ts("toast.linkCopyError"),
      color: "error",
    });
  }
}

defineShortcuts({
  escape: () => emit("close"),
});
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    :title="$ts('modal.share.shareRecipe')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Visibility -->
        <div v-if="loadingVisibility" class="flex items-center justify-between">
          <div class="flex-1">
            <USkeleton class="h-5 w-20" />
            <USkeleton class="mt-1 h-4 w-48" />
          </div>
          <USkeleton class="h-6 w-10 rounded-full" />
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <div class="font-medium">{{ $ts("modal.share.visibility") }}</div>
            <div class="text-muted text-sm">
              {{
                visibility === "public"
                  ? $ts("modal.share.visibilityPublic")
                  : $ts("modal.share.visibilityPrivate")
              }}
            </div>
          </div>
          <USwitch
            :model-value="visibility === 'public'"
            @update:model-value="toggleVisibility"
          />
        </div>

        <USeparator />

        <!-- Share links -->
        <div>
          <div class="mb-3 flex items-center justify-between">
            <div class="font-medium">{{ $ts("modal.share.shareLinks") }}</div>
            <UButton
              size="sm"
              icon="i-lucide-plus"
              :label="$ts('actions.createLink')"
              :loading="creatingLink"
              @click="createLink"
            />
          </div>

          <div v-if="loadingLinks" class="flex flex-col gap-2">
            <USkeleton v-for="i in 2" :key="i" class="h-14 w-full rounded-md" />
          </div>
          <div
            v-else-if="links.length === 0"
            class="text-muted py-4 text-center text-sm"
          >
            {{ $ts("modal.share.noLinks") }}
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="link in links"
              :key="link.id"
              class="bg-elevated flex items-center justify-between gap-2 rounded-md p-2"
              :class="{ 'opacity-50': link.expired }"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1 truncate font-mono text-xs">
                  {{ getShareUrl(link.token) }}
                  <UBadge
                    v-if="link.locale"
                    :label="link.locale.toUpperCase()"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    class="shrink-0"
                  />
                </div>
                <div class="text-muted text-xs">
                  {{ $ts("modal.share.created") }}
                  {{ new Date(link.createdAt).toLocaleDateString() }}
                  <template v-if="link.expiresAt">
                    ·
                    {{
                      link.expired
                        ? $ts("modal.share.expired")
                        : `${$ts("modal.share.expires")} ${new Date(link.expiresAt).toLocaleDateString()}`
                    }}
                  </template>
                </div>
              </div>
              <div class="flex gap-1">
                <UButton
                  v-if="!link.expired"
                  icon="i-lucide-copy"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="copyLink(link.token)"
                />
                <UButton
                  v-if="isEditor"
                  icon="i-lucide-trash-2"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="revokeLink(link.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="soft"
        :label="$ts('actions.close')"
        @click="emit('close')"
      />
    </template>
  </UModal>
</template>

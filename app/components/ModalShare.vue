<script setup lang="ts">
import type { ShareLink } from "~~/shared/types";

const props = defineProps<{
  recipePath: string;
}>();

const emit = defineEmits<{ close: [] }>();
const toast = useToast();

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
      `/api/sharing/visibility/${recipePath}`,
    );
    visibility.value = data.visibility;
  } catch {
    // keep default
  } finally {
    loadingVisibility.value = false;
  }

  try {
    const data = await $fetchWithHeaders<ShareLink[]>("/api/sharing/links", {
      query: { recipePath },
    });
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
    await $fetchWithHeaders(`/api/sharing/visibility/${props.recipePath}`, {
      method: "PUT",
      body: { visibility: newVisibility },
    });
    visibility.value = newVisibility;
    toast.add({
      title: "Visibility updated",
      description: `Recipe is now ${newVisibility}`,
      color: "success",
    });
  } catch {
    toast.add({
      title: "Error",
      description: "Failed to update visibility",
      color: "error",
    });
  }
}

const creatingLink = ref(false);

async function createLink() {
  creatingLink.value = true;
  try {
    const data = await $fetchWithHeaders<Omit<ShareLink, "expired">>(
      "/api/sharing/links",
      {
        method: "POST",
        body: { recipePath: props.recipePath },
      },
    );
    links.value.unshift({ ...data, expired: false });
    toast.add({
      title: "Share link created",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Error",
      description: "Failed to create share link",
      color: "error",
    });
  } finally {
    creatingLink.value = false;
  }
}

async function revokeLink(id: number) {
  try {
    await $fetchWithHeaders(`/api/sharing/links/${id}`, {
      method: "DELETE",
    });
    links.value = links.value.filter((l) => l.id !== id);
    toast.add({
      title: "Share link revoked",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Error",
      description: "Failed to revoke share link",
      color: "error",
    });
  }
}

function getShareUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(getShareUrl(token));
    toast.add({
      title: "Link copied to clipboard",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Error",
      description: "Failed to copy link",
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
    title="Share Recipe"
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
            <div class="font-medium">Visibility</div>
            <div class="text-muted text-sm">
              {{
                visibility === "public"
                  ? "Anyone can view this recipe"
                  : "Only you can view this recipe"
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
            <div class="font-medium">Share Links</div>
            <UButton
              size="sm"
              icon="i-lucide-plus"
              label="Create Link"
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
            No share links yet
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="link in links"
              :key="link.id"
              class="bg-elevated flex items-center justify-between gap-2 rounded-md p-2"
              :class="{ 'opacity-50': link.expired }"
            >
              <div class="min-w-0 flex-1">
                <div class="truncate font-mono text-xs">
                  {{ getShareUrl(link.token) }}
                </div>
                <div class="text-muted text-xs">
                  Created {{ new Date(link.createdAt).toLocaleDateString() }}
                  <template v-if="link.expiresAt">
                    ·
                    {{
                      link.expired
                        ? "Expired"
                        : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`
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
        label="Close"
        @click="emit('close')"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ShoppingListShareLink } from "~~/shared/types";

const emit = defineEmits<{ close: [] }>();
const toast = useToast();
const { isEditor } = useRole();
const { baseUrl } = await usePublicConfig();

// Share links
const links = ref<ShoppingListShareLink[]>([]);
const loadingLinks = ref(true);

// Load links
try {
  const data = await $fetchWithHeaders<ShoppingListShareLink[]>(
    "/api/sharing/list/links",
  );
  links.value = data;
} catch {
  // keep default
} finally {
  loadingLinks.value = false;
}

// Expiration date (YYYY-MM-DD string, empty = no expiry)
const expiresAt = ref("");
const minDate = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

const creatingLink = ref(false);

async function createLink() {
  creatingLink.value = true;
  try {
    const data = await $fetchWithHeaders<
      Omit<ShoppingListShareLink, "expired">
    >("/api/sharing/list/links", {
      method: "POST",
      body: {
        expiresAt: expiresAt.value
          ? new Date(expiresAt.value + "T00:00:00").toISOString()
          : undefined,
      },
    });
    links.value.unshift({ ...data, expired: false });
    expiresAt.value = "";
    toast.add({ title: "Share link created", color: "success" });
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
    await $fetchWithHeaders(`/api/sharing/list/links/${id}`, {
      method: "DELETE",
    });
    links.value = links.value.filter((l) => l.id !== id);
    toast.add({ title: "Share link revoked", color: "success" });
  } catch {
    toast.add({
      title: "Error",
      description: "Failed to revoke share link",
      color: "error",
    });
  }
}

function getShareUrl(token: string): string {
  return `${baseUrl.value}/s/l/${token}`;
}

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(getShareUrl(token));
    toast.add({ title: "Link copied to clipboard", color: "success" });
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
    title="Share Shopping List"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Create new link -->
        <div>
          <div class="mb-3 font-medium">Share Links</div>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField label="Expires (optional)">
              <UInput v-model="expiresAt" type="date" :min="minDate" />
            </UFormField>
            <UButton
              icon="i-lucide-plus"
              label="Create Link"
              size="sm"
              :loading="creatingLink"
              @click="createLink"
            />
          </div>
        </div>

        <USeparator />

        <!-- Link list -->
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

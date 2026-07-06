<script setup lang="ts">
import type { ShoppingListShareLink } from "~~/shared/types";

const emit = defineEmits<{ close: [] }>();
const toast = useToast();
const { $ts } = useI18n();
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
    toast.add({ title: $ts("toast.shareLinkCreated"), color: "success" });
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
    await $fetchWithHeaders(`/api/sharing/list/links/${id}`, {
      method: "DELETE",
    });
    links.value = links.value.filter((l) => l.id !== id);
    toast.add({ title: $ts("toast.shareLinkRevoked"), color: "success" });
  } catch {
    toast.add({
      title: $ts("toast.error"),
      description: $ts("toast.shareLinkRevokeError"),
      color: "error",
    });
  }
}

const { copy } = useClipboard({ legacy: true });

function getShareUrl(token: string): string {
  return `${baseUrl.value}/s/l/${token}`;
}

async function copyLink(token: string) {
  try {
    await copy(getShareUrl(token));
    toast.add({ title: $ts("toast.linkCopied"), color: "success" });
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
    :title="$ts('modal.share.shareShoppingList')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Create new link -->
        <div>
          <div class="mb-3 font-medium">
            {{ $ts("modal.share.shareLinks") }}
          </div>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField :label="$ts('modal.share.expiresOptional')">
              <UInput
                v-model="expiresAt"
                size="sm"
                type="date"
                :min="minDate"
                :ui="{ base: 'appearance-auto' }"
              />
            </UFormField>
            <UButton
              icon="i-lucide-plus"
              class="mb-px"
              :label="$ts('actions.createLink')"
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
              <div class="truncate font-mono text-xs">
                {{ getShareUrl(link.token) }}
              </div>
              <div class="text-muted text-xs">
                {{ $ts("modal.share.created") }}
                {{
                  $td(new Date(link.createdAt), {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                }}
                <template v-if="link.expiresAt">
                  ·
                  {{
                    link.expired
                      ? $ts("modal.share.expired")
                      : `${$ts("modal.share.expires")} ${$td(
                          new Date(link.expiresAt),
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          },
                        )}`
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
        :label="$ts('actions.close')"
        @click="emit('close')"
      />
    </template>
  </UModal>
</template>

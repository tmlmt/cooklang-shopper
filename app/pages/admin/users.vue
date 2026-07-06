<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h, resolveComponent } from "vue";
import type { AdminUser, AdminUsersResponse, Role } from "~~/shared/types";

const { $t, $ts } = useI18n();

definePageMeta({
  middleware: "admin",
});
useSeoMeta({
  title: () => $ts("title"),
});

const toast = useToast();
const { open: openConfirmation } = await useModalConfirmation();
const { copy } = useClipboard({ legacy: true });
const { hasAuth } = await usePublicConfig();
const canInvite = computed(() => hasAuth("google") || hasAuth("microsoft"));

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const USelect = resolveComponent("USelect");

const page = ref(1);
const pageSize = ref(20);

const { data, refresh, status } = await useFetch<AdminUsersResponse>(
  "/api/admin/users",
  {
    query: { page, pageSize },
  },
);

const users = computed(() => data.value?.users ?? []);
const total = computed(() => data.value?.total ?? 0);

const roleOptions = computed<{ label: string; value: Role }[]>(() => [
  { label: $ts("roles.viewer"), value: "viewer" },
  { label: $ts("roles.editor"), value: "editor" },
  { label: $ts("roles.admin"), value: "admin" },
]);

// --- Invite new user ---
const inviteEmail = ref("");
const inviteName = ref("");
const inviteRole = ref<Role>("viewer");
const inviting = ref(false);
const updatingRoleFor = ref<Set<number>>(new Set());

async function inviteUser() {
  inviting.value = true;
  try {
    const res = await $fetchWithHeaders<{
      inviteUrl: string;
      emailed: boolean;
    }>("/api/admin/users", {
      method: "POST",
      body: {
        email: inviteEmail.value,
        displayName: inviteName.value || undefined,
        role: inviteRole.value,
      },
    });
    inviteEmail.value = "";
    inviteName.value = "";
    inviteRole.value = "viewer";
    await refresh();
    notifyInvite(res.emailed, res.inviteUrl);
  } catch (e) {
    toast.add({
      title: $ts("toast.inviteFailed"),
      description: (e as { data?: { message?: string } })?.data?.message,
      color: "error",
    });
  } finally {
    inviting.value = false;
  }
}

function notifyInvite(emailed: boolean, inviteUrl: string) {
  if (emailed) {
    toast.add({ title: $ts("toast.invited"), color: "success" });
  } else {
    toast.add({
      title: $ts("toast.invitedNoEmail"),
      description: inviteUrl,
      color: "info",
      actions: [
        {
          label: $ts("actions.copyLink"),
          onClick: () => copyToClipboard(inviteUrl),
        },
      ],
    });
  }
}

function copyToClipboard(text: string) {
  copy(text);
  toast.add({ title: $ts("toast.linkCopied"), color: "success" });
}

async function changeRole(user: AdminUser, role: Role) {
  if (role === user.role) return;
  if (updatingRoleFor.value.has(user.id)) return;
  updatingRoleFor.value = new Set(updatingRoleFor.value).add(user.id);
  const request = () =>
    $fetchWithHeaders(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: { role },
    });
  try {
    try {
      await request();
    } catch {
      // Silent retry — first request to a route can fail in dev due to
      // Nitro lazy-compiling the handler; the second attempt always works.
      await request();
    }
    await refresh();
  } catch (e) {
    toast.add({
      title: $ts("toast.updateFailed"),
      description: (e as { data?: { message?: string } })?.data?.message,
      color: "error",
    });
  } finally {
    const next = new Set(updatingRoleFor.value);
    next.delete(user.id);
    updatingRoleFor.value = next;
  }
}

async function resendInvite(user: AdminUser) {
  try {
    const res = await $fetchWithHeaders<{
      inviteUrl: string;
      emailed: boolean;
    }>(`/api/admin/users/${user.id}/resend-invite`, { method: "POST" });
    notifyInvite(res.emailed, res.inviteUrl);
  } catch (e) {
    toast.add({
      title: $ts("toast.inviteFailed"),
      description: (e as { data?: { message?: string } })?.data?.message,
      color: "error",
    });
  }
}

async function deleteUser(user: AdminUser) {
  const confirmed = await openConfirmation(
    $ts("confirmDelete", { email: user.email }),
  );
  if (!confirmed) return;
  try {
    await $fetchWithHeaders(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });
    await refresh();
    toast.add({ title: $ts("toast.deleted"), color: "success" });
  } catch (e) {
    toast.add({
      title: $ts("toast.deleteFailed"),
      description: (e as { data?: { message?: string } })?.data?.message,
      color: "error",
    });
  }
}

const columns = computed<TableColumn<AdminUser>[]>(() => [
  {
    accessorKey: "email",
    header: () => $t("columns.email"),
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: "displayName",
    header: () => $t("columns.name"),
    cell: ({ row }) => row.original.displayName || "—",
  },
  {
    accessorKey: "role",
    header: () => $t("columns.role"),
    cell: ({ row }) =>
      h(USelect, {
        modelValue: row.original.role,
        items: roleOptions.value,
        size: "sm",
        disabled: updatingRoleFor.value.has(row.original.id),
        "onUpdate:modelValue": (value: Role) => changeRole(row.original, value),
      }),
  },
  {
    accessorKey: "status",
    header: () => $t("columns.status"),
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.status === "active" ? "success" : "neutral",
          variant: "subtle",
        },
        () =>
          row.original.status === "active"
            ? $t("status.active")
            : $t("status.invited"),
      ),
  },
  {
    accessorKey: "providers",
    header: () => $t("columns.providers"),
    cell: ({ row }) =>
      row.original.providers.length ? row.original.providers.join(", ") : "—",
  },
  {
    id: "actions",
    header: () => $t("columns.actions"),
    cell: ({ row }) =>
      h("div", { class: "flex justify-end gap-1" }, [
        row.original.status === "invited"
          ? h(UButton, {
              icon: "i-mdi-email-sync-outline",
              color: "neutral",
              variant: "ghost",
              size: "sm",
              title: $ts("actions.resend"),
              onClick: () => resendInvite(row.original),
            })
          : null,
        h(UButton, {
          icon: "i-mdi-trash-can-outline",
          color: "error",
          variant: "ghost",
          size: "sm",
          title: $ts("actions.delete"),
          onClick: () => deleteUser(row.original),
        }),
      ]),
  },
]);
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <h1 class="text-3xl">{{ $t("title") }}</h1>

    <UCard v-if="canInvite">
      <template #header>{{ $t("inviteHeader") }}</template>
      <form
        class="flex flex-col gap-3 md:flex-row md:items-end"
        @submit.prevent="inviteUser"
      >
        <UFormField :label="$ts('columns.email')" class="grow">
          <UInput
            v-model="inviteEmail"
            type="email"
            required
            :placeholder="$ts('emailPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$ts('columns.name')" class="grow">
          <UInput
            v-model="inviteName"
            :placeholder="$ts('namePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$ts('columns.role')">
          <USelect v-model="inviteRole" :items="roleOptions" />
        </UFormField>
        <UButton
          type="submit"
          :label="$ts('actions.invite')"
          :loading="inviting"
          :disabled="!inviteEmail"
        />
      </form>
    </UCard>
    <UAlert
      v-else
      icon="i-mdi-information-outline"
      color="neutral"
      variant="subtle"
      :description="$ts('noInviteProviders')"
    />

    <UTable :data="users" :columns="columns" :loading="status === 'pending'" />

    <div v-if="total > pageSize" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="pageSize"
      />
    </div>
  </div>
</template>

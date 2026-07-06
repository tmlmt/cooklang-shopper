<script setup lang="ts">
const { $t, $ts } = useI18n();

definePageMeta({
  layout: "naked",
});
useSeoMeta({
  title: () => $ts("title"),
});

const { session, fetch: fetchSession } = useUserSession();
const { $localeRoute } = useI18n();
const toast = useToast();

const pending = computed(() => session.value?.pendingClaim);

const code = ref("");
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    await $fetchWithHeaders("/api/auth/claim-admin", {
      method: "POST",
      body: { code: code.value },
    });
    await fetchSession();
    await navigateTo($localeRoute("/admin/users"));
  } catch {
    toast.add({
      title: $ts("invalidTitle"),
      description: $ts("invalidDetail"),
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="max-w-lg">
    <template #header>{{ $t("title") }}</template>
    <div v-if="pending" class="flex flex-col gap-4">
      <p class="text-sm text-muted">{{ $t("instructions") }}</p>
      <p v-if="pending.email" class="text-sm">
        {{ $t("identity") }} <b>{{ pending.email }}</b>
      </p>
      <UForm class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField :label="$ts('codeLabel')" name="code">
          <UInput
            v-model="code"
            :placeholder="$ts('codePlaceholder')"
            autocomplete="off"
          />
        </UFormField>
        <UButton
          type="submit"
          :label="$ts('actions.claim')"
          :disabled="!code"
          :loading="loading"
        />
        <UButton
          color="neutral"
          variant="ghost"
          :label="$ts('actions.skip')"
          :to="$localeRoute('/auth')"
        />
      </UForm>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <p>{{ $t("noPending") }}</p>
      <UButton
        color="neutral"
        variant="outline"
        :label="$ts('actions.backToLogin')"
        :to="$localeRoute('/auth')"
      />
    </div>
  </UCard>
</template>

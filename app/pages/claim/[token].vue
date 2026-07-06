<script setup lang="ts">
const { $t, $ts } = useI18n();

definePageMeta({
  layout: "naked",
});
useSeoMeta({
  title: () => $ts("title"),
});

const route = useRoute();
const token = computed(() => String(route.params.token ?? ""));

const { data } = await useFetch(() => `/api/auth/invite/${token.value}`, {
  key: () => `invite-${token.value}`,
});

const valid = computed(() => data.value?.valid ?? false);
const providers = computed(
  () => data.value?.providers ?? { google: false, microsoft: false },
);

function signIn(provider: "google" | "microsoft") {
  // The invitation token is carried through the OAuth flow via `state`.
  navigateTo(`/auth/${provider}?state=${encodeURIComponent(token.value)}`, {
    external: true,
  });
}
</script>

<template>
  <UCard class="max-w-lg">
    <template #header>{{ $t("title") }}</template>
    <div v-if="valid" class="flex flex-col gap-4">
      <p class="text-sm text-muted">{{ $t("instructions") }}</p>
      <UButton
        v-if="providers.google"
        icon="i-mdi-google"
        color="primary"
        size="lg"
        block
        :label="$ts('continueWith', { provider: 'Google' })"
        @click="signIn('google')"
      />
      <UButton
        v-if="providers.microsoft"
        icon="i-mdi-microsoft"
        color="primary"
        size="lg"
        block
        :label="$ts('continueWith', { provider: 'Microsoft' })"
        @click="signIn('microsoft')"
      />
      <p
        v-if="!providers.google && !providers.microsoft"
        class="text-sm text-muted"
      >
        {{ $t("noProviders") }}
      </p>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <p>{{ $t("invalid") }}</p>
      <UButton
        color="neutral"
        variant="outline"
        :label="$ts('actions.backToLogin')"
        :to="$localeRoute('/auth')"
      />
    </div>
  </UCard>
</template>

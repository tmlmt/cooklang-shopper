<script setup lang="ts">
import type { Role } from "~~/shared/types";

const { $t, $ts, $localeRoute } = useI18n();

definePageMeta({
  layout: "naked",
});
useSeoMeta({
  title: $ts("pages.authentication"),
  description: $ts("description"),
});

const { loggedIn, user, clear, fetch: fetchSession } = useUserSession();
const toast = useToast();
const route = useRoute();
const siteConfig = useSiteConfig();

defineOgImage(
  "DefaultOgImage",
  {
    title: siteConfig.name,
    subtitle: $ts("pages.authentication"),
    description: $ts("description"),
  },
  [
    // Primary image for og:image and twitter:image (1200x600)
    { key: "og" },
    // Additional square image for WhatsApp (800x800)
    { key: "whatsapp", width: 800, height: 800 },
  ],
);

// Show OIDC error if redirected back with error — before async calls so it fires immediately
if (import.meta.client) {
  if (route.query.error === "oidc") {
    toast.add({
      title: $ts("toast.loginFailed"),
      description: $ts("toast.oidcFailedDetail"),
      color: "error",
    });
  } else if (route.query.error === "oidc-unreachable") {
    toast.add({
      title: $ts("toast.oidcUnreachable"),
      description: $ts("toast.oidcUnreachableDetail"),
      color: "error",
    });
  }
}

const { hasAuth, getAuthProviders, title: appTitle } = await usePublicConfig();
const oidcProviders = computed(() => getAuthProviders("oidc"));
const googleProviders = computed(() => getAuthProviders("google"));
const microsoftProviders = computed(() => getAuthProviders("microsoft"));
const hasAccountProviders = computed(
  () => googleProviders.value.length > 0 || microsoftProviders.value.length > 0,
);
const roles = computed<{ label: string; value: Role }[]>(() => [
  { label: $ts("roleViewer"), value: "viewer" },
  { label: $ts("roleEditor"), value: "editor" },
  ...(hasAuth("password")
    ? [{ label: $ts("roleAdmin"), value: "admin" as Role }]
    : []),
]);
const selectedRole = ref<Role>("viewer");
const password = ref("");
const loading = ref(false);
const oidcLoading = ref<string | null>(null);

async function loginWithOidc(providerName: string) {
  oidcLoading.value = providerName;
  try {
    await $fetch(`/api/auth/oidc/${providerName}/check`);
    await navigateTo(`/auth/oidc/${providerName}`, { external: true });
  } catch {
    toast.add({
      title: $ts("toast.oidcUnreachable"),
      description: $ts("toast.oidcCheckUnreachable"),
      color: "error",
    });
  } finally {
    oidcLoading.value = null;
  }
}

async function login() {
  loading.value = true;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { role: selectedRole.value, password: password.value },
    });
    await fetchSession();
    await navigateTo("/auth");
  } catch (e) {
    const status = (e as { status?: number })?.status;
    toast.add({
      title: $ts("toast.loginFailed"),
      description:
        status === 403
          ? $ts("toast.loginAdminNotConfigured")
          : $ts("toast.loginInvalidPassword"),
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await clear();
  password.value = "";
  toast.add({
    title: $ts("toast.loggedOut"),
    description: $ts("toast.loggedOutDetail"),
    color: "success",
  });
}
</script>

<template>
  <UCard class="max-w-2xl">
    <template #header
      >{{ appTitle }} - {{ $t("pages.authentication") }}</template
    >
    <div v-if="loggedIn" class="flex flex-col items-center gap-4">
      <p>
        {{ $t("loggedInAs") }}
        <b>{{ user?.profile ?? "" }}</b>
        ({{
          user?.role
            ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
            : ""
        }})
      </p>
      <UButton
        color="neutral"
        variant="outline"
        :label="$ts('actions.goToCookbook')"
        :to="$localeRoute('/')"
      />
      <UButton color="primary" @click="logout">{{
        $t("actions.signOut")
      }}</UButton>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <UButton
        v-for="provider in oidcProviders"
        :key="provider.name"
        icon="i-mdi-shield-key-outline"
        :label="$ts('signInWith', { provider: provider.name })"
        color="primary"
        size="lg"
        block
        :loading="oidcLoading === provider.name"
        @click="loginWithOidc(provider.name)"
      />

      <UButton
        v-for="provider in googleProviders"
        :key="provider.name"
        icon="i-mdi-google"
        :label="$ts('signInWithGoogle')"
        color="primary"
        size="lg"
        block
        @click="
          () => {
            navigateTo('/auth/google', { external: true });
          }
        "
      />

      <UButton
        v-for="provider in microsoftProviders"
        :key="provider.name"
        icon="i-mdi-microsoft"
        :label="$ts('signInWithMicrosoft')"
        color="primary"
        size="lg"
        block
        @click="
          () => {
            navigateTo('/auth/microsoft', { external: true });
          }
        "
      />

      <div
        v-if="
          (oidcProviders.length > 0 || hasAccountProviders) &&
          hasAuth('password')
        "
        class="flex w-full items-center gap-4"
      >
        <USeparator class="flex-1" />
        <span class="text-sm text-gray-500">{{ $t("or") }}</span>
        <USeparator class="flex-1" />
      </div>

      <UForm
        v-if="hasAuth('password')"
        class="flex w-full flex-col gap-4"
        @submit.prevent="login"
      >
        <UFormField :label="$ts('roleLabel')" name="role">
          <URadioGroup
            v-model="selectedRole"
            orientation="horizontal"
            variant="list"
            :items="roles"
          />
        </UFormField>
        <UFormField :label="$ts('passwordLabel')" name="password">
          <UInput
            v-model="password"
            type="password"
            :placeholder="$ts('passwordPlaceholder')"
          />
        </UFormField>
        <UButton
          type="submit"
          :label="$ts('actions.login')"
          :disabled="!password"
          :loading="loading"
        />
      </UForm>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Role } from "~~/shared/types";

definePageMeta({
  layout: "naked",
  title: "Authentication",
  description: "Sign in to access your cookbook",
});
const { loggedIn, user, clear, fetch: fetchSession } = useUserSession();
const toast = useToast();
const route = useRoute();

// Show OIDC error if redirected back with error — before async calls so it fires immediately
if (import.meta.client) {
  if (route.query.error === "oidc") {
    toast.add({
      title: "Login failed",
      description: "OIDC authentication failed. Please try again.",
      color: "error",
    });
  } else if (route.query.error === "oidc-unreachable") {
    toast.add({
      title: "Provider unreachable",
      description:
        "The authentication provider could not be reached. Please try again later.",
      color: "error",
    });
  }
}

const { hasAuth, getAuthProviders, title: appTitle } = await usePublicConfig();
const oidcProviders = computed(() => getAuthProviders("oidc"));
const roles: { label: string; value: Role }[] = [
  { label: "Viewer", value: "viewer" },
  { label: "Editor", value: "editor" },
];
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
      title: "Provider unreachable",
      description:
        "The authentication provider could not be reached. Check your network connection.",
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
    await navigateTo("/", { external: true });
  } catch {
    toast.add({
      title: "Login failed",
      description: "Invalid password",
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
    title: "Logged out",
    description: "You have been successfully logged out",
    color: "success",
  });
}
</script>

<template>
  <UCard class="max-w-2xl">
    <template #header>{{ appTitle }} - Authentication</template>
    <div v-if="loggedIn" class="flex flex-col items-center gap-4">
      <p>
        You are logged in as
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
        label="Go to Cookbook"
        @click="navigateTo('/')"
      />
      <UButton color="primary" @click="logout">Sign out</UButton>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <UButton
        v-for="provider in oidcProviders"
        :key="provider.name"
        icon="i-mdi-shield-key-outline"
        :label="`Sign in with ${provider.name}`"
        color="primary"
        size="lg"
        block
        :loading="oidcLoading === provider.name"
        @click="loginWithOidc(provider.name)"
      />

      <div
        v-if="oidcProviders.length > 0 && hasAuth('password')"
        class="flex w-full items-center gap-4"
      >
        <USeparator class="flex-1" />
        <span class="text-sm text-gray-500">or</span>
        <USeparator class="flex-1" />
      </div>

      <UForm
        v-if="hasAuth('password')"
        class="flex w-full flex-col gap-4"
        @submit.prevent="login"
      >
        <UFormField label="Role" name="role">
          <URadioGroup
            v-model="selectedRole"
            orientation="horizontal"
            variant="list"
            :items="roles"
          />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput
            v-model="password"
            type="password"
            placeholder="Enter your password"
          />
        </UFormField>
        <UButton
          type="submit"
          label="Login"
          :disabled="!password"
          :loading="loading"
        />
      </UForm>
    </div>
  </UCard>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "naked",
});
const { loggedIn, clear, fetch: fetchSession } = useUserSession();
const appTitle = useRuntimeConfig().public.title;
const toast = useToast();
const profiles = ref(["Chef"]);
const selectedProfile = ref(profiles.value[0]);
const password = ref("");
const loading = ref(false);

async function login() {
  loading.value = true;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { password: password.value },
    });
    await fetchSession();
    await navigateTo("/");
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
      <p>You are logged in.</p>
      <UButton
        color="neutral"
        variant="outline"
        label="Go to Cookbook"
        @click="navigateTo('/')"
      />
      <UButton color="primary" @click="logout">Logout</UButton>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <UForm class="flex flex-col gap-4" @submit.prevent="login">
        <UFormField label="Profile" name="profile">
          <URadioGroup
            v-model="selectedProfile"
            orientation="horizontal"
            variant="list"
            :items="profiles"
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

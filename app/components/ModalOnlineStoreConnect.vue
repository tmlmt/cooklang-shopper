<script setup lang="ts">
import * as v from "valibot";

defineProps<{
  provider: string;
}>();

const { $ts } = useI18n();
const onlineStore = useOnlineStoreStore();

const emit = defineEmits<{ close: [boolean] }>();

const schema = v.object({
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty($ts("onlineStore.usernameRequired")),
  ),
  password: v.pipe(v.string(), v.nonEmpty($ts("onlineStore.passwordRequired"))),
});

const state = reactive({ username: "", password: "" });
const form = useTemplateRef("form");
const loading = ref(false);
const errorMessage = ref("");

const submit = async () => {
  try {
    await form.value?.validate({});
  } catch {
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    await onlineStore.login(state.username.trim(), state.password);
    emit("close", true);
  } catch (err: unknown) {
    errorMessage.value =
      (err as { data?: { message?: string }; message?: string })?.data
        ?.message ??
      (err as { message?: string })?.message ??
      $ts("onlineStore.connectFailed");
  } finally {
    loading.value = false;
  }
};

defineShortcuts({
  escape: () => emit("close", false),
  enter: { handler: () => submit(), usingInput: true },
});
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="$ts('onlineStore.connectTitle', { provider })"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="form" :schema="schema" :state="state" @submit="submit">
        <div class="flex flex-col gap-4">
          <UFormField
            :label="$ts('onlineStore.username')"
            name="username"
            :required="true"
          >
            <UInput
              v-model="state.username"
              autocomplete="username"
              :ui="{ root: 'w-full' }"
            />
          </UFormField>
          <UFormField
            :label="$ts('onlineStore.password')"
            name="password"
            :required="true"
          >
            <UInput
              v-model="state.password"
              type="password"
              autocomplete="current-password"
              :ui="{ root: 'w-full' }"
            />
          </UFormField>
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            :description="errorMessage"
          />
          <p class="text-sm text-muted">
            {{ $ts("onlineStore.credentialsHint") }}
          </p>
        </div>
      </UForm>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="$ts('actions.cancel')"
          @click="emit('close', false)"
        />
        <UButton
          color="primary"
          :loading="loading"
          :label="$ts('onlineStore.connect')"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

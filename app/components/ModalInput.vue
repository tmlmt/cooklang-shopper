<script setup lang="ts">
import * as v from "valibot";

const {
  title,
  label,
  placeholder = "",
  submitLabel = "Save",
  initialValue = "",
} = defineProps<{
  title: string;
  label: string;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
}>();

const emit = defineEmits<{ close: [string | false] }>();

const { $ts } = useI18n();

defineShortcuts({
  escape: () => emit("close", false),
});

const schema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty($ts('validation.enterValue')),
  v.excludes("/", $ts('validation.noSlash')),
  v.excludes("\\", $ts('validation.noBackslash')),
);

const state = ref(initialValue);
const form = useTemplateRef("form");

const save = async () => {
  try {
    await form.value?.validate({});
    emit("close", state.value.trim());
  } catch {
    return;
  }
};
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="title"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="form" :schema="schema" :state="state" @submit="save">
        <UFormField :label="label" name="value" :required="true">
          <UInput
            v-model="state"
            :placeholder="placeholder"
            :ui="{ root: 'w-full' }"
          />
        </UFormField>
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
        <UButton color="primary" :label="submitLabel" @click="save" />
      </div>
    </template>
  </UModal>
</template>

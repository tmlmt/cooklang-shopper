<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";

export type TranslateResult = {
  locale: string;
  method: "manual" | "ai";
};

const emit = defineEmits<{ close: [result: TranslateResult | undefined] }>();

const { $ts } = useI18n();

const schema = v.object({
  locale: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty($ts("validation.localeRequired")),
    v.check((val) => /^[a-z]{2}$/.test(val), $ts("validation.localeInvalid")),
  ),
  method: v.picklist(["manual", "ai"] as const),
});

type Schema = v.InferOutput<typeof schema>;

const formState = ref<{ locale: string; method: "manual" | "ai" }>({
  locale: "",
  method: "manual",
});

const methodOptions = [
  { label: $ts("translation.manual"), value: "manual" },
  { label: $ts("translation.usingAi"), value: "ai" },
];

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit("close", { locale: event.data.locale, method: event.data.method });
}

defineShortcuts({
  escape: () => emit("close", undefined),
});
</script>

<template>
  <UModal
    :title="$ts('translation.modalTitle')"
    @close="emit('close', undefined)"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="formState"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          name="locale"
          :label="$ts('translation.localeLabel')"
          :description="$ts('translation.localeDescription')"
          required
        >
          <UInput
            v-model="formState.locale"
            placeholder="en"
            maxlength="2"
            autocomplete="off"
            class="w-24"
          />
        </UFormField>

        <UFormField name="method" :label="$ts('translation.methodLabel')">
          <URadioGroup
            v-model="formState.method"
            :items="methodOptions"
            value-key="value"
          />
        </UFormField>

        <div class="flex gap-3">
          <UButton type="submit" :label="$ts('translation.translateButton')" />
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :label="$ts('actions.cancel')"
            @click="emit('close', undefined)"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

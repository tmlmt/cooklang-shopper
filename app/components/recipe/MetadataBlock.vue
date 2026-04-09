<script setup lang="ts">
import type { Recipe, MetadataObject } from "@tmlmt/cooklang-parser";
import type { MetadataDisplayValue } from "#shared/types";

const { recipe } = defineProps<{
  recipe: Recipe;
}>();

interface MetadataEntry {
  key: string;
  value?: MetadataDisplayValue;
  subEntries?: Array<Array<{ key: string; value: MetadataDisplayValue }>>;
}

const introductionText = computed(() => {
  if (!recipe) return undefined;
  const metadata = recipe.metadata;
  const intro =
    (metadata as Record<string, unknown>).introduction ??
    (metadata as Record<string, unknown>).description;
  return intro ? String(intro) : undefined;
});

const tags = computed<string[]>(() => {
  if (!recipe) return [];
  const raw = (recipe.metadata as Record<string, unknown>).tags;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string")
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  return [];
});

const standardMetadataKeys = new Set([
  "title",
  "yield",
  "servings",
  "serves",
  "tags",
  "variants",
  "introduction",
  "description",
  "author",
  "source",
  "time",
]);

const nonStandardMetaData = computed(() => {
  if (!recipe) return [] as MetadataEntry[];
  const entries: MetadataEntry[] = [];
  const metadata = recipe.metadata;

  for (const [key, value] of Object.entries(metadata)) {
    if (standardMetadataKeys.has(key)) continue;
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const hasObjects = value.some(
        (item) => typeof item === "object" && item !== null,
      );
      if (hasObjects) {
        const subEntries = value.map((item) => {
          if (typeof item === "object" && item !== null) {
            const obj = item as MetadataObject;
            return Object.entries(obj).map(([k, v]) => ({
              key: k,
              value: maybeDetectURLinText(v, true),
            }));
          }
          return [{ key: "", value: maybeDetectURLinText(item, true) }];
        });
        entries.push({ key, subEntries });
      } else {
        entries.push({
          key,
          value: maybeDetectURLinText(value.join(", "), true),
        });
      }
    } else if (typeof value === "object" && value !== null) {
      const obj = value as MetadataObject;
      const subEntries = [
        Object.entries(obj).map(([k, v]) => ({
          key: k,
          value: maybeDetectURLinText(v, true),
        })),
      ];
      entries.push({ key, subEntries });
    } else {
      entries.push({ key, value: maybeDetectURLinText(value, true) });
    }
  }

  return entries;
});
</script>

<template>
  <div>
    <RecipeMetadataAuthorSource
      :author="recipe.metadata.author"
      :source="recipe.metadata.source"
    />
    <p v-if="introductionText" class="my-2 text-base">
      {{ introductionText }}
    </p>
    <div
      v-if="tags.length > 0"
      class="my-2 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="flex gap-1.5">
        <UBadge
          v-for="tag in tags"
          :key="tag"
          :label="tag"
          class="rounded-full"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </div>
    </div>
    <RecipeMetadataTime :time="recipe.metadata.time" />
    <UCollapsible v-if="nonStandardMetaData.length > 0" class="mt-2">
      <UButton
        class="group"
        label="More info"
        color="neutral"
        variant="soft"
        trailing-icon="i-lucide-chevron-down"
        size="sm"
        :ui="{
          trailingIcon:
            'group-data-[state=open]:rotate-180 transition-transform duration-200',
        }"
      />
      <template #content>
        <ul
          class="mt-2 ml-6 list-disc text-sm text-neutral-600 dark:text-neutral-400"
        >
          <li v-for="entry in nonStandardMetaData" :key="entry.key">
            <b>{{ entry.key }}: </b>
            <ULink
              v-if="entry.value?.href"
              :to="entry.value.href"
              target="_blank"
            >
              {{ entry.value.text }}
            </ULink>
            <span v-else-if="entry.value">{{ entry.value.text }}</span>
            <template v-if="entry.subEntries">
              <div
                v-for="(obj, oIdx) in entry.subEntries"
                :key="oIdx"
                class="my-0.5 ml-2 flex flex-row gap-2"
              >
                <div class="text-base">•</div>
                <ul class="mt-[0.1rem] list-inside">
                  <li
                    v-for="(field, fIdx) in obj"
                    :key="fIdx"
                    class="list-none"
                  >
                    <span v-if="field.key" class="font-medium"
                      >{{ field.key }}:
                    </span>
                    <ULink
                      v-if="field.value.href"
                      :to="field.value.href"
                      target="_blank"
                    >
                      {{ field.value.text }}
                    </ULink>
                    <template v-else>{{ field.value.text }}</template>
                  </li>
                </ul>
              </div>
            </template>
          </li>
        </ul>
      </template>
    </UCollapsible>
  </div>
</template>

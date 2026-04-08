<script setup lang="ts">
import type {
  Recipe,
  MetadataTime,
  MetadataSource,
  MetadataObject,
} from "@tmlmt/cooklang-parser";
import { Patterns } from "human-regex";

const { recipe } = defineProps<{
  recipe: Recipe;
}>();

interface MetadataEntry {
  key: string;
  value?: MetadataDisplayValue;
  subEntries?: Array<Array<{ key: string; value: MetadataDisplayValue }>>;
}

interface MetadataDisplayValue {
  text: string;
  href?: string;
}

const formatAsText = (val: unknown): string => {
  if (val === undefined || val === null) return "";
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(formatAsText).join(", ");
  if (typeof val === "object")
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${formatAsText(v)}`)
      .join(", ");
  return String(val);
};

const displayValue = (
  value: unknown,
  detectUrls = false,
): MetadataDisplayValue => {
  const text =
    typeof value === "object" && value !== null
      ? formatAsText(value)
      : String(value);
  if (detectUrls) {
    const trimmed = text.trim();
    if (trimmed && Patterns.url().test(trimmed)) {
      return { text, href: trimmed };
    }
  }
  return { text };
};

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

const hiddenMetadataKeys = new Set([
  "title",
  "yield",
  "servings",
  "serves",
  "tags",
  "variants",
  "introduction",
  "description",
]);

const nonTitleMetaData = computed(() => {
  if (!recipe) return [] as MetadataEntry[];
  const entries: MetadataEntry[] = [];
  const metadata = recipe.metadata;

  for (const [key, value] of Object.entries(metadata)) {
    if (hiddenMetadataKeys.has(key)) continue;
    if (value === undefined || value === null) continue;

    if (key === "time") {
      const timeValue = value as MetadataTime;
      if (timeValue.prep)
        entries.push({ key: "prep time", value: displayValue(timeValue.prep) });
      if (timeValue.cook)
        entries.push({ key: "cook time", value: displayValue(timeValue.cook) });
      if (timeValue.total)
        entries.push({
          key: "total time",
          value: displayValue(timeValue.total),
        });
      continue;
    }

    if (key === "source") {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const sourceValue = value as MetadataSource;
        const sourceText =
          sourceValue.name && sourceValue.author
            ? `${sourceValue.name} (${sourceValue.author})`
            : sourceValue.name || sourceValue.author || "";

        if (
          sourceValue.url &&
          sourceValue.url.trim().length > 0 &&
          Patterns.url().test(sourceValue.url.trim())
        ) {
          entries.push({
            key: "source",
            value: {
              text: sourceText || sourceValue.url,
              href: sourceValue.url.trim(),
            },
          });
        } else {
          const fallback =
            sourceValue.url && sourceValue.url.trim().length > 0
              ? sourceText
                ? `${sourceText} (${sourceValue.url})`
                : sourceValue.url
              : sourceText;
          entries.push({ key: "source", value: displayValue(fallback) });
        }
      } else {
        entries.push({ key: "source", value: displayValue(value, true) });
      }
      continue;
    }

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
              value: displayValue(v, true),
            }));
          }
          return [{ key: "", value: displayValue(item, true) }];
        });
        entries.push({ key, subEntries });
      } else {
        entries.push({ key, value: displayValue(value.join(", "), true) });
      }
    } else if (typeof value === "object" && value !== null) {
      const obj = value as MetadataObject;
      const subEntries = [
        Object.entries(obj).map(([k, v]) => ({
          key: k,
          value: displayValue(v, true),
        })),
      ];
      entries.push({ key, subEntries });
    } else {
      entries.push({ key, value: displayValue(value, true) });
    }
  }

  return entries;
});
</script>

<template>
  <div>
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
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </div>
    </div>
    <div v-if="nonTitleMetaData.length > 0" class="my-4 flex flex-col">
      <ul class="ml-6 list-disc text-sm text-neutral-600 dark:text-neutral-400">
        <li v-for="entry in nonTitleMetaData" :key="entry.key">
          <b>{{ entry.key }}: </b>
          <ULink
            v-if="entry.value?.href"
            :to="entry.value.href"
            :boolean="true"
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
                <li v-for="(field, fIdx) in obj" :key="fIdx" class="list-none">
                  <span v-if="field.key" class="font-medium"
                    >{{ field.key }}:
                  </span>
                  <ULink
                    v-if="field.value.href"
                    :to="field.value.href"
                    :boolean="true"
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
    </div>
  </div>
</template>

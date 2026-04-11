import { Recipe } from "@tmlmt/cooklang-parser";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { RecipeIndex } from "~~/shared/types";

const recipeIndex = new Map<string, RecipeIndex[number]>();

export function getRecipeIndex() {
  return recipeIndex;
}

export async function initRecipeIndex() {
  recipeIndex.clear();
  const storage = useStorage("recipes");
  const keys = await storage.getKeys();

  for (const key of keys.filter((k) => k.endsWith(".cook"))) {
    const content = await storage.getItem(key);
    if (!content) continue;
    try {
      await updateRecipeIndex(key, content.toString());
    } catch (err) {
      console.warn(`Failed to index recipe "${key}":`, err);
    }
  }
}

function getTimeMetadata(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const times: Record<string, string> = {};
  for (const [metaKey, value] of Object.entries(metadata)) {
    if (!metaKey.toLowerCase().includes("time")) {
      continue;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      times[metaKey] = value;
    }
  }
  return times;
}

export async function updateRecipeIndex(key: string, content: string) {
  const parsed = new Recipe(content);
  const normalizedKey = key.endsWith(".cook") ? key : `${key}.cook`;
  const keyAsPath = normalizedKey.replace(/:/g, "/");
  let name = keyAsPath.split("/").pop()!;
  if (name.endsWith(".cook")) {
    name = name.substring(0, name.length - 5);
  }
  const recipeKey = normalizedKey.substring(0, normalizedKey.length - 5);

  let lastModified: string | undefined;
  try {
    const recipePath = path.join(process.cwd(), "public", "recipes", keyAsPath);
    const fileStats = await stat(recipePath);
    lastModified = fileStats.mtime.toISOString();
  } catch {
    // Keep indexing even if file stats are temporarily unavailable.
  }

  const metadata = parsed.metadata as Record<string, unknown>;
  const times = getTimeMetadata(metadata);

  recipeIndex.set(recipeKey, {
    name,
    title: parsed.metadata.title || name,
    dir: keyAsPath.split("/").slice(0, -1).join("/"),
    servings: parsed.servings ?? 1,
    tags: parsed.metadata.tags || [],
    lastModified,
    times: Object.keys(times).length > 0 ? times : undefined,
    author: typeof metadata.author === "string" ? metadata.author : undefined,
    source: typeof metadata.source === "string" ? metadata.source : undefined,
  });
}

export function deleteFromRecipeIndex(key: string) {
  const recipeKey = key.endsWith(".cook")
    ? key.substring(0, key.length - 5)
    : key;
  recipeIndex.delete(recipeKey);
}

export function moveInRecipeIndex(
  oldKey: string,
  newKey: string,
  newDir: string,
) {
  const entry = recipeIndex.get(oldKey);
  if (!entry) return;
  recipeIndex.delete(oldKey);
  recipeIndex.set(newKey, { ...entry, dir: newDir });
}

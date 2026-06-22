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

  for (const key of keys.filter((k: string) => k.endsWith(".cook"))) {
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
):
  | { prep?: number | string; cook?: number | string; total?: number | string }
  | undefined {
  const time = metadata.time as
    | {
        prep?: number | string;
        cook?: number | string;
        total?: number | string;
      }
    | undefined;
  if (!time) return undefined;
  const result: {
    prep?: number | string;
    cook?: number | string;
    total?: number | string;
  } = {};
  if (time.prep !== undefined) result.prep = time.prep;
  if (time.cook !== undefined) result.cook = time.cook;
  if (time.total !== undefined) result.total = time.total;
  return Object.keys(result).length > 0 ? result : undefined;
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

  recipeIndex.set(recipeKey, {
    name,
    title: parsed.metadata.title || name,
    dir: keyAsPath.split("/").slice(0, -1).join("/"),
    servings: parsed.servings ?? 1,
    tags: parsed.metadata.tags || [],
    lastModified,
    times: getTimeMetadata(metadata),
    author: typeof metadata.author === "string" ? metadata.author : undefined,
    source: typeof metadata.source === "string" ? metadata.source : undefined,
    description:
      typeof metadata.description === "string"
        ? metadata.description
        : typeof metadata.introduction === "string"
          ? metadata.introduction
          : undefined,
    difficulty:
      typeof metadata.difficulty === "string" ? metadata.difficulty : undefined,
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

import { ShoppingList, Recipe } from "@tmlmt/cooklang-parser";
import type {
  RecipeChoices,
  ShoppingListRecipeRef,
  AddedIngredient,
  CategorizedIngredients,
} from "@tmlmt/cooklang-parser";
import type { RecipeChoicesWire } from "~~/shared/types";
import {
  readFile,
  writeFile,
  readdir,
  unlink,
  appendFile,
} from "node:fs/promises";
import nodePath from "node:path";
import { createError } from "h3";
import { getRecipeIndex } from "./recipeIndex";
import { getStreams } from "./sseRegistry";
import { readPantryFile } from "./pantryUtils";
import { readCategoryConfigFile } from "./categoryConfigUtils";
import { parseQuantityValue } from "~~/shared/utils/parseQuantityValue";

const recipesDir = nodePath.resolve(process.cwd(), "public", "recipes");

// Index: userKey → listName → ShoppingList
// listName "" = default list
const index = new Map<string, Map<string, ShoppingList>>();

// ---------------------------------------------------------------------------
// SSE broadcast
// ---------------------------------------------------------------------------

function broadcastListUpdate(userKey: string, data: ShoppingListData): void {
  const streams = getStreams(userKey);
  if (!streams || streams.size === 0) return;
  const payload = JSON.stringify(data);
  for (const stream of streams) {
    stream.push(payload).catch(() => {
      // Stream may have closed; will be cleaned up via onClosed
    });
  }
}

type ShoppingFileType = "list" | "checked";

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

function buildFilename(
  type: ShoppingFileType,
  userKey: string,
  listName: string = "",
): string {
  const base = type === "list" ? ".shopping-list" : ".shopping-checked";
  return listName ? `${base}.${userKey}.${listName}` : `${base}.${userKey}`;
}

export function parseFilename(
  filename: string,
): { type: ShoppingFileType; userKey: string; listName: string } | null {
  let type: ShoppingFileType;
  let rest: string;

  if (filename.startsWith(".shopping-list.")) {
    type = "list";
    rest = filename.substring(".shopping-list.".length);
  } else if (filename.startsWith(".shopping-checked.")) {
    type = "checked";
    rest = filename.substring(".shopping-checked.".length);
  } else {
    return null;
  }

  if (!rest) return null;

  // userKey has no dots (sanitized in getUserKey), so first dot separates
  // userKey from listName
  const dotIndex = rest.indexOf(".");
  if (dotIndex === -1) {
    return { type, userKey: rest, listName: "" };
  }
  return {
    type,
    userKey: rest.substring(0, dotIndex),
    listName: rest.substring(dotIndex + 1),
  };
}

function resolvedPath(
  type: ShoppingFileType,
  userKey: string,
  listName: string = "",
): string {
  return nodePath.join(recipesDir, buildFilename(type, userKey, listName));
}

// ---------------------------------------------------------------------------
// Index access
// ---------------------------------------------------------------------------

function getOrCreateUserLists(userKey: string): Map<string, ShoppingList> {
  let userLists = index.get(userKey);
  if (!userLists) {
    userLists = new Map();
    index.set(userKey, userLists);
  }
  return userLists;
}

export function getShoppingList(
  userKey: string,
  listName: string = "",
): ShoppingList | undefined {
  return index.get(userKey)?.get(listName);
}

async function getOrCreateShoppingList(
  userKey: string,
  listName: string = "",
): Promise<ShoppingList> {
  const userLists = getOrCreateUserLists(userKey);
  let sl = userLists.get(listName);
  if (!sl) {
    sl = new ShoppingList();
    userLists.set(listName, sl);
    try {
      const pantryContent = await readPantryFile(userKey);
      if (pantryContent) {
        sl.addPantry(pantryContent);
      }
    } catch (err) {
      console.warn(
        `Shopping index: failed to apply pantry for "${userKey}":`,
        err,
      );
    }
    try {
      const categoryConfigContent = await readCategoryConfigFile(userKey);
      if (categoryConfigContent) {
        sl.setCategoryConfig(categoryConfigContent);
      }
    } catch (err) {
      console.warn(
        `Shopping index: failed to apply category config for "${userKey}":`,
        err,
      );
    }
  }
  return sl;
}

export function applyPantryToUserLists(userKey: string, content: string): void {
  const userLists = index.get(userKey);
  if (!userLists) return;
  for (const [listName, sl] of userLists) {
    sl.addPantry(content);
    broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
  }
}

export function applyCategoryConfigToUserLists(
  userKey: string,
  content: string,
): void {
  const userLists = index.get(userKey);
  if (!userLists) return;
  for (const [listName, sl] of userLists) {
    sl.setCategoryConfig(content);
    broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
  }
}

export function getUserListNames(userKey: string): string[] {
  const userLists = index.get(userKey);
  if (!userLists) return [];
  return Array.from(userLists.keys());
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

async function writeListFile(
  userKey: string,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) return;
  await writeFile(
    resolvedPath("list", userKey, listName),
    sl.serializeFile(),
    "utf-8",
  );
}

async function deleteFiles(
  userKey: string,
  listName: string = "",
): Promise<void> {
  for (const type of ["list", "checked"] as ShoppingFileType[]) {
    try {
      await unlink(resolvedPath(type, userKey, listName));
    } catch {
      // File may not exist
    }
  }
}

// ---------------------------------------------------------------------------
// Hydration: resolve recipe refs by loading .cook files
// ---------------------------------------------------------------------------

async function hydrateRef(
  sl: ShoppingList,
  ref: ShoppingListRecipeRef,
): Promise<void> {
  // Parser paths use ./ prefix, storage uses raw path + .cook extension
  const storagePath = ref.path.startsWith("./")
    ? ref.path.substring(2)
    : ref.path;
  const storage = useStorage("recipes");
  const content = await storage.getItem(storagePath + ".cook");

  if (!content) {
    console.warn(
      `Shopping index: recipe "${ref.path}" not found, skipping hydration`,
    );
    return;
  }

  sl.hydrateRecipe(ref.path, new Recipe(content.toString()));
}

// ---------------------------------------------------------------------------
// Initialization (called at startup)
// ---------------------------------------------------------------------------

export async function initShoppingIndex(): Promise<void> {
  console.log("Starting shopping lists indexation");
  index.clear();

  let entries: string[];
  try {
    entries = await readdir(recipesDir);
  } catch {
    console.warn("Shopping index: recipes directory not found");
    return;
  }

  // First pass: load all .shopping-list.* files
  for (const filename of entries) {
    const parsed = parseFilename(filename);
    if (!parsed || parsed.type !== "list") continue;

    try {
      const content = await readFile(
        nodePath.join(recipesDir, filename),
        "utf-8",
      );
      const sl = await getOrCreateShoppingList(parsed.userKey, parsed.listName);
      const refs = sl.loadFile(content);

      for (const ref of refs) {
        await hydrateRef(sl, ref);
      }

      // hydrateRecipe (called by hydrateRef) triggers calculateIngredients.
      // If there are no recipes, calculateIngredients is never called, so
      // sl.ingredients stays empty even though manualItems were loaded.
      // Re-add them via the public API to trigger the calculation.
      if (refs.length === 0 && sl.manualItems.length > 0) {
        const items = sl.manualItems.splice(0);
        for (const item of items) {
          sl.addManualItem(item);
        }
      }
    } catch (err) {
      console.warn(`Shopping index: failed to load "${filename}":`, err);
    }
  }

  // Second pass: load all .shopping-checked.* files
  for (const filename of entries) {
    const parsed = parseFilename(filename);
    if (!parsed || parsed.type !== "checked") continue;

    const sl = getShoppingList(parsed.userKey, parsed.listName);
    if (!sl) continue; // Orphaned checked file

    try {
      const content = await readFile(
        nodePath.join(recipesDir, filename),
        "utf-8",
      );
      sl.loadCheckedFile(content);
    } catch (err) {
      console.warn(
        `Shopping index: failed to load checked file "${filename}":`,
        err,
      );
    }
  }
  console.log("Completed shopping lists indexation");
}

// ---------------------------------------------------------------------------
// Public API return type
// ---------------------------------------------------------------------------

export interface ShoppingListData {
  recipes: Array<{
    path: string;
    title: string;
    servings: number;
    locale?: string;
    choices?: RecipeChoicesWire;
  }>;
  ingredients: AddedIngredient[];
  manualItems: AddedIngredient[];
  checkedItems: string[];
  categories: CategorizedIngredients;
}

export function getShoppingListData(
  userKey: string,
  listName: string = "",
): ShoppingListData {
  const sl = getShoppingList(userKey, listName);
  if (!sl) {
    return {
      recipes: [],
      ingredients: [],
      manualItems: [],
      checkedItems: [],
      categories: {},
    };
  }

  const recipeIndex = getRecipeIndex();

  const recipes = sl.recipes.map((r) => {
    // Strip ./ prefix to get the stored path (may include a lang code)
    const storedPath = r.path?.startsWith("./")
      ? r.path.substring(2)
      : (r.path ?? "");

    // Separate base path (for navigation) from locale (for display)
    const { baseKey, langCode } = parseRecipeKey(storedPath);
    const basePath = baseKey;

    // Index is keyed by colon-separated base key
    const indexKey = basePath.replace(/\//g, ":");
    const indexEntry = recipeIndex.get(indexKey);
    const servings =
      "servings" in r ? r.servings : (r.recipe.servings ?? 1) * r.factor;

    return {
      path: basePath,
      title: indexEntry?.title ?? basePath.split("/").pop() ?? basePath,
      servings,
      locale: langCode,
      choices: r.choices
        ? {
            ingredientItems: [
              ...(
                r.choices.ingredientItems ?? new Map<string, number>()
              ).entries(),
            ],
            ingredientGroups: [
              ...(
                r.choices.ingredientGroups ?? new Map<string, number>()
              ).entries(),
            ],
            variant: r.choices.variant,
          }
        : undefined,
    };
  });

  return {
    recipes,
    ingredients: sl.ingredients,
    manualItems: sl.manualItems,
    checkedItems: Array.from(sl.checkedItems),
    categories: sl.categories ?? {},
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addRecipeToList(
  userKey: string,
  recipePath: string,
  servings: number,
  choices?: RecipeChoices,
  listName: string = "",
): Promise<void> {
  const sl = await getOrCreateShoppingList(userKey, listName);

  // Prevent adding if ANY variant of this recipe is already in the list.
  // Compare by base path (strip lang code) so users cannot add the same
  // recipe twice by switching languages.
  const { baseKey: baseRecipePath } = parseRecipeKey(recipePath);
  const isDuplicate = sl.recipes.some((r) => {
    const rRaw = r.path?.startsWith("./")
      ? r.path.substring(2)
      : (r.path ?? "");
    const { baseKey: rBase } = parseRecipeKey(rRaw);
    return rBase === baseRecipePath;
  });
  if (isDuplicate) {
    throw createError({
      status: 409,
      statusText: "Recipe already in shopping list",
    });
  }

  // Load recipe content — recipePath may include a lang code (e.g. "italian/pasta.en")
  const storage = useStorage("recipes");
  const content = await storage.getItem(recipePath + ".cook");
  if (!content) {
    throw createError({ status: 404, statusText: "Recipe not found" });
  }

  const recipe = new Recipe(content.toString());
  sl.addRecipe(recipe, {
    path: `./${recipePath}`,
    scaling: { servings },
    choices,
  });

  await writeListFile(userKey, listName);
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function updateRecipeInList(
  userKey: string,
  recipePath: string,
  servings: number,
  choices?: RecipeChoices,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) {
    throw createError({
      status: 404,
      statusText: "Shopping list not found",
    });
  }

  // Match by base path to find the stored entry (which may have a lang code)
  const { baseKey: baseRecipePath } = parseRecipeKey(recipePath);
  const existingIdx = sl.recipes.findIndex((r) => {
    const rRaw = r.path?.startsWith("./")
      ? r.path.substring(2)
      : (r.path ?? "");
    const { baseKey: rBase } = parseRecipeKey(rRaw);
    return rBase === baseRecipePath;
  });
  if (existingIdx === -1) {
    throw createError({
      status: 404,
      statusText: "Recipe not found in shopping list",
    });
  }

  // Retrieve the stored path (preserves lang code for reloading the right file)
  const storedParserPath = sl.recipes[existingIdx]!.path ?? `./${recipePath}`;
  const storedFilePath = storedParserPath.startsWith("./")
    ? storedParserPath.substring(2)
    : storedParserPath;

  sl.removeRecipe(existingIdx);

  const storage = useStorage("recipes");
  const content = await storage.getItem(storedFilePath + ".cook");
  if (!content) {
    throw createError({ status: 404, statusText: "Recipe not found" });
  }

  sl.addRecipe(new Recipe(content.toString()), {
    path: storedParserPath,
    scaling: { servings },
    choices,
  });

  await writeListFile(userKey, listName);
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function removeRecipeFromList(
  userKey: string,
  recipePath: string,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) {
    throw createError({
      status: 404,
      statusText: "Shopping list not found",
    });
  }

  // Match by base path (the caller always sends the base path, without lang code)
  const { baseKey: baseRecipePath } = parseRecipeKey(recipePath);
  const recipeIdx = sl.recipes.findIndex((r) => {
    const rRaw = r.path?.startsWith("./")
      ? r.path.substring(2)
      : (r.path ?? "");
    const { baseKey: rBase } = parseRecipeKey(rRaw);
    return rBase === baseRecipePath;
  });
  if (recipeIdx === -1) {
    throw createError({
      status: 404,
      statusText: "Recipe not found in shopping list",
    });
  }
  sl.removeRecipe(recipeIdx);

  if (sl.recipes.length === 0 && sl.manualItems.length === 0) {
    // Clean up empty list
    const userLists = index.get(userKey);
    if (userLists) {
      userLists.delete(listName);
      if (userLists.size === 0) index.delete(userKey);
    }
    await deleteFiles(userKey, listName);
  } else {
    await writeListFile(userKey, listName);
  }
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function clearList(
  userKey: string,
  listName: string = "",
): Promise<void> {
  const userLists = index.get(userKey);
  if (userLists) {
    userLists.delete(listName);
    if (userLists.size === 0) index.delete(userKey);
  }
  await deleteFiles(userKey, listName);
}

export async function clearAllRecipes(
  userKey: string,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) return;
  while (sl.recipes.length > 0) {
    sl.removeRecipe(0);
  }
  if (sl.manualItems.length === 0) {
    const userLists = index.get(userKey);
    if (userLists) {
      userLists.delete(listName);
      if (userLists.size === 0) index.delete(userKey);
    }
    await deleteFiles(userKey, listName);
  } else {
    await writeListFile(userKey, listName);
  }
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function clearAllManualItems(
  userKey: string,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) return;
  while (sl.manualItems.length > 0) {
    sl.removeManualItem(0);
  }
  if (sl.recipes.length === 0) {
    const userLists = index.get(userKey);
    if (userLists) {
      userLists.delete(listName);
      if (userLists.size === 0) index.delete(userKey);
    }
    await deleteFiles(userKey, listName);
  } else {
    await writeListFile(userKey, listName);
  }
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function checkIngredient(
  userKey: string,
  ingredientName: string,
  checked: boolean,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) {
    throw createError({
      status: 404,
      statusText: "Shopping list not found",
    });
  }

  if (checked) {
    sl.check(ingredientName);
  } else {
    sl.uncheck(ingredientName);
  }

  // Append to checked file (fast, no full rewrite)
  const line = ShoppingList.checkedAppendLine(ingredientName, checked);
  await appendFile(resolvedPath("checked", userKey, listName), line, "utf-8");
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function uncheckAll(
  userKey: string,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) {
    throw createError({
      status: 404,
      statusText: "Shopping list not found",
    });
  }

  sl.uncheckAll();

  // Delete the checked file
  try {
    await unlink(resolvedPath("checked", userKey, listName));
  } catch {
    // File may not exist
  }
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function removeManualItem(
  userKey: string,
  itemIndex: number,
  listName: string = "",
): Promise<void> {
  const sl = getShoppingList(userKey, listName);
  if (!sl) {
    throw createError({
      status: 404,
      statusText: "Shopping list not found",
    });
  }
  sl.removeManualItem(itemIndex);

  if (sl.recipes.length === 0 && sl.manualItems.length === 0) {
    const userLists = index.get(userKey);
    if (userLists) {
      userLists.delete(listName);
      if (userLists.size === 0) index.delete(userKey);
    }
    await deleteFiles(userKey, listName);
  } else {
    await writeListFile(userKey, listName);
  }
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

export async function addManualItem(
  userKey: string,
  name: string,
  quantity?: string,
  unit?: string,
  listName: string = "",
): Promise<void> {
  const sl = await getOrCreateShoppingList(userKey, listName);
  const newItem: AddedIngredient = { name };
  if (quantity) {
    newItem.quantities = [
      { quantity: parseQuantityValue(quantity), ...(unit ? { unit } : {}) },
    ];
  }
  sl.addManualItem(newItem);
  await writeListFile(userKey, listName);
  broadcastListUpdate(userKey, getShoppingListData(userKey, listName));
}

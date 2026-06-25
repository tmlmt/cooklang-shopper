import { rename, copyFile, unlink } from "node:fs/promises";
import * as nodePath from "node:path";

interface SetDefaultBody {
  /** Base recipe path (e.g. "italian/pasta") */
  path: string;
  /** Lang code of the variant to promote to default (e.g. "fr") */
  newDefaultLangCode: string;
  /**
   * If the current default file has no locale metadata and user didn't
   * provide one via modal, this can be undefined — in that case the old
   * default is given the lang code from its metadata (already extracted
   * server-side), or falls back to config defaultLocale.
   */
  oldDefaultLangCode?: string;
}

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const body = await readBody<SetDefaultBody>(event);

  if (!body.path || typeof body.path !== "string") {
    throw createError({ status: 400, statusText: "path is required" });
  }
  validateRecipePath(body.path);

  if (!body.newDefaultLangCode || !isValidLangCode(body.newDefaultLangCode)) {
    throw createError({
      status: 400,
      statusText: "newDefaultLangCode must be a valid 2-letter language code",
    });
  }

  if (
    body.oldDefaultLangCode !== undefined &&
    !isValidLangCode(body.oldDefaultLangCode)
  ) {
    throw createError({
      status: 400,
      statusText: "oldDefaultLangCode must be a valid 2-letter language code",
    });
  }

  const baseKey = body.path.replace(/\//g, ":");
  const { hasDefault, langCodes } = getVariantsForBase(baseKey);

  if (!langCodes.includes(body.newDefaultLangCode)) {
    throw createError({
      status: 404,
      statusText: `Variant .${body.newDefaultLangCode}.cook not found`,
    });
  }

  const storage = useStorage("recipes");
  const fsBase = nodePath.join(process.cwd(), "public", "recipes");
  const recipePath = body.path;

  // Determine what lang code to use for the old default file
  let oldDefaultTargetLang = body.oldDefaultLangCode;
  if (hasDefault && !oldDefaultTargetLang) {
    // Infer from index defaultLocale
    const indexEntry = getRecipeIndex().get(baseKey);
    oldDefaultTargetLang = indexEntry?.defaultLocale;
  }

  if (hasDefault && !oldDefaultTargetLang) {
    throw createError({
      status: 400,
      statusText:
        "Cannot determine language code for the current default file. Provide oldDefaultLangCode.",
    });
  }

  // --- File operations ---

  const defaultFsPath = nodePath.join(fsBase, `${recipePath}.cook`);
  const newVariantFsPath = nodePath.join(
    fsBase,
    `${recipePath}.${body.newDefaultLangCode}.cook`,
  );
  const tempFsPath = defaultFsPath + ".tmp";

  // Step 1: Rename current default → .{oldDefaultTargetLang}.cook (via temp to avoid collision)
  if (hasDefault) {
    try {
      await rename(defaultFsPath, tempFsPath);
    } catch {
      await copyFile(defaultFsPath, tempFsPath);
      await unlink(defaultFsPath);
    }
  }

  // Step 2: Rename chosen variant → default
  try {
    await rename(newVariantFsPath, defaultFsPath);
  } catch {
    await copyFile(newVariantFsPath, defaultFsPath);
    await unlink(newVariantFsPath);
  }

  // Step 3: Move temp → .{oldDefaultTargetLang}.cook
  if (hasDefault && oldDefaultTargetLang) {
    const oldDefaultNewFsPath = nodePath.join(
      fsBase,
      `${recipePath}.${oldDefaultTargetLang}.cook`,
    );
    try {
      await rename(tempFsPath, oldDefaultNewFsPath);
    } catch {
      await copyFile(tempFsPath, oldDefaultNewFsPath);
      await unlink(tempFsPath);
    }
  }

  // --- Update storage (Nitro) ---
  if (hasDefault) {
    const oldDefaultContent = await storage.getItem(
      baseKey + `.${body.newDefaultLangCode}.cook`,
    );
    const newVariantContent = oldDefaultContent; // will be overwritten below

    // Load new default content from FS (already moved)
    const newDefaultKey = baseKey;
    const newDefaultContent = await storage.getItem(newDefaultKey + ".cook");
    if (!newDefaultContent) {
      // Sync storage from FS
      const { readFile } = await import("node:fs/promises");
      const fsContent = await readFile(defaultFsPath, "utf-8");
      await storage.setItem(newDefaultKey + ".cook", fsContent);
      await updateRecipeIndex(newDefaultKey + ".cook", fsContent);
    } else {
      await updateRecipeIndex(
        newDefaultKey + ".cook",
        String(newDefaultContent),
      );
    }

    if (oldDefaultTargetLang) {
      const oldDefaultNewKey = `${baseKey}.${oldDefaultTargetLang}`;
      const oldDefaultFsPath = nodePath.join(
        fsBase,
        `${recipePath}.${oldDefaultTargetLang}.cook`,
      );
      const { readFile } = await import("node:fs/promises");
      const fsContent = await readFile(oldDefaultFsPath, "utf-8");
      await storage.setItem(oldDefaultNewKey + ".cook", fsContent);
      await storage.removeItem(`${baseKey}.${body.newDefaultLangCode}.cook`);
      deleteFromRecipeIndex(`${baseKey}.${body.newDefaultLangCode}.cook`);
      await updateRecipeIndex(oldDefaultNewKey + ".cook", fsContent);
    }
    void newVariantContent; // suppress unused warning
  } else {
    // No previous default: just promote the variant
    const { readFile } = await import("node:fs/promises");
    const fsContent = await readFile(defaultFsPath, "utf-8");
    await storage.setItem(baseKey + ".cook", fsContent);
    await storage.removeItem(`${baseKey}.${body.newDefaultLangCode}.cook`);
    deleteFromRecipeIndex(`${baseKey}.${body.newDefaultLangCode}.cook`);
    await updateRecipeIndex(baseKey + ".cook", fsContent);
  }

  const recipeIndex = getRecipeIndex();
  const recipes = Object.fromEntries(recipeIndex.entries());
  return { recipes };
});

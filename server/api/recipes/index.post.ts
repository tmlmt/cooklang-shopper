import path from "node:path";
import { access, writeFile } from "node:fs/promises";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const body = await readBody(event);
  if (body.dir === undefined) {
    throw createError({
      status: 400,
      statusText: "No target directory was provided",
    });
  }
  validateRecipeDir(body.dir.trim());
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      status: 400,
      statusText: "No filename was provided",
    });
  }
  // Also ensure the filename doesn't contain path separators
  if (body.name.includes("/") || body.name.includes("\\")) {
    throw createError({
      status: 400,
      statusText: "The filename must not contain path separators.",
    });
  }
  if (!body.content || body.content.trim().length === 0) {
    throw createError({
      status: 400,
      statusText: "No recipe content was provided",
    });
  }

  let newFile = path.join(
    process.cwd(),
    "public",
    "recipes",
    body.dir.trim(),
    body.name.trim() + ".cook",
  );
  let suffix = "";
  let counter = 0;
  let exists = true;
  let originalExists = true;

  while (exists) {
    try {
      await access(newFile + suffix);
      counter++;
      suffix = ` (${counter})`;
    } catch (error) {
      if (isSystemErrorWithCode(error, "ENOENT")) {
        if (suffix === "") {
          originalExists = false;
        }
        exists = false;
      } else if (isSystemError(error)) {
        throw createError({
          status: 500,
          statusText: `Error checking file: ${error.message}`,
        });
      }
    }
  }

  if (suffix) {
    newFile += suffix;
  }

  try {
    await writeFile(newFile, body.content);
  } catch (err) {
    throw createError({
      status: 500,
      statusText: `Error creating recipe: ${err}`,
    });
  }

  const recipeName = body.name.trim() + suffix;
  const recipeKey = (
    body.dir.trim() ? `${body.dir.trim()}/${recipeName}` : recipeName
  )
    .replace(/\//g, ":")
    .replace(".cook", "");
  await updateRecipeIndex(`${recipeKey}.cook`, body.content);

  return { renamed: originalExists, name: recipeName };
});

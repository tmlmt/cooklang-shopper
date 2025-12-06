import path from "node:path";
import { access, writeFile } from "node:fs/promises";
import {
  isSystemError,
  isSystemErrorWithCode,
} from "~~/server/utils/isSystemError";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (body.dir === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "No target directory was provided",
    });
  }
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No filename was provided",
    });
  }
  // Also ensure the filename doesn't contain path separators
  if (body.name.includes("/") || body.name.includes("\\")) {
    throw createError({
      statusCode: 400,
      statusMessage: "The filename must not contain path separators.",
    });
  }
  if (!body.content || body.content.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No recipe content was provided",
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
          statusCode: 500,
          statusMessage: `Error checking file: ${error.message}`,
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
      statusCode: 500,
      statusMessage: `Error creating recipe: ${err}`,
    });
  }

  return { renamed: originalExists, name: body.name + suffix };
});

import path from "node:path";
import { access, mkdir } from "node:fs/promises";
import {
  isSystemError,
  isSystemErrorWithCode,
} from "~~/server/utils/isSystemError";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (body.parentDir === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "No parent directory was provided",
    });
  }
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No sub-directory name was provided",
    });
  }
  // Also ensure the name itself doesn't contain path separators, as it should be a single directory.
  if (body.name.includes("/") || body.name.includes("\\")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Sub-directory name must not contain path separators.",
    });
  }

  let newDir = path.join(
    process.cwd(),
    "public",
    "recipes",
    body.parentDir.trim(),
    body.name.trim(),
  );
  let suffix = "";
  let counter = 0;
  let exists = true;
  let originalExists = true;

  while (exists) {
    try {
      await access(newDir + suffix);
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
          statusMessage: `Error checking directory: ${error.message}`,
        });
      }
    }
  }

  if (suffix) {
    newDir += suffix;
  }

  try {
    await mkdir(newDir);
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error creating directory: ${err}`,
    });
  }

  return { renamed: originalExists, name: body.name + suffix };
});

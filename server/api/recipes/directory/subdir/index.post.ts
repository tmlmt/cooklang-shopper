import path from "node:path";
import { access, mkdir } from "node:fs/promises";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  // Checking the parent directory for validity and security
  const body = await readBody(event);
  if (body.parentDir === undefined) {
    throw createError({
      status: 400,
      statusText: "No parent directory was provided",
    });
  }
  validateRecipeDir(body.parentDir.trim());
  // Also ensure the name itself doesn't contain path separators, as it should be a single directory.
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      status: 400,
      statusText: "No sub-directory name was provided",
    });
  }
  if (body.name.includes("/") || body.name.includes("\\")) {
    throw createError({
      status: 400,
      statusText: "Sub-directory name must not contain path separators.",
    });
  }
  // Validate the new directory name
  validateRecipeDir(body.name.trim());

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
          status: 500,
          statusText: `Error checking directory: ${error.message}`,
        });
      }
    }
  }

  if (suffix) {
    newDir += suffix;
  }

  try {
    await mkdir(newDir, { recursive: true });
  } catch (err) {
    throw createError({
      status: 500,
      statusText: `Error creating directory: ${err}`,
    });
  }

  return { renamed: originalExists, name: body.name + suffix };
});

import * as nodePath from "node:path";
import { getRouterParam, createError, type RequestEvent } from "nuxt/server";
import type { H3Event } from "h3";
import { validateRecipePath } from "~~/shared/utils/validateRecipePath";

const recipesRoot = nodePath.resolve(process.cwd(), "public", "recipes");

function assertWithinRecipesRoot(resolvedPath: string) {
  if (
    !resolvedPath.startsWith(recipesRoot + nodePath.sep) &&
    resolvedPath !== recipesRoot
  ) {
    throw createError({
      status: 400,
      statusText: "Invalid recipe path",
    });
  }
}

export function getValidatedRecipePath(event: RequestEvent | H3Event): string {
  const path = getRouterParam(event, "path");
  if (!path) {
    throw createError({
      status: 400,
      statusText: "No recipe path was provided",
    });
  }
  try {
    validateRecipePath(path);
  } catch (e) {
    throw createError({ status: 400, statusText: (e as Error).message });
  }

  const decodedPath = decodeURIComponent(path).replace(/\+/g, " ");

  const resolved = nodePath.resolve(recipesRoot, decodedPath);
  assertWithinRecipesRoot(resolved);

  return decodedPath;
}

export function validateRecipeDir(dir: string) {
  if (dir === "") return;
  try {
    validateRecipePath(dir);
  } catch (e) {
    throw createError({ status: 400, statusText: (e as Error).message });
  }

  const resolved = nodePath.resolve(recipesRoot, dir);
  assertWithinRecipesRoot(resolved);
}

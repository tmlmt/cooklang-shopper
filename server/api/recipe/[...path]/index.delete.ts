import type { RecipeIndex } from "~~/types";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");
  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: "No recipe path was provided",
    });
  }
  if (!/^(?!\/)(?:[\p{L}\p{N}_ +%.-]+\/)*[\p{L}\p{N}_ +%.-]+$/u.test(path)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid recipe path",
    });
  }

  // Allow for urls to be written with "+" sign instead of space
  const decodedPath = decodeURIComponent(path).replace("+", " ");

  const storage = useStorage("recipes");

  // Remove the recipe file itself
  await storage.removeItem(decodedPath + ".cook");

  // Remove the recipe from the index
  const index = (await storage.getItem("index.json")) as
    | { recipes: RecipeIndex }
    | undefined;
  if (!index) return false;
  const recipeKey = decodedPath.replace("/", ":");
  /* eslint-disable @typescript-eslint/no-dynamic-delete */
  delete index.recipes[recipeKey];
  await storage.setItem("index.json", index);

  return index;
});

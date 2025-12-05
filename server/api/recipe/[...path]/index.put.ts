import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeIndex } from "~~/types";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");
  // Validating incoming value
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
  const decodedPath = decodeURIComponent(path);

  // Checking whether a recipe body was provided
  const body = await readBody(event);
  if (!body.recipe || body.recipe.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No recipe or empty recipe was provided",
    });
  }

  // Saving
  const storage = useStorage("recipes");
  await storage.setItem(decodedPath + ".cook", body.recipe.trim());

  // Update index entry
  const index = (await storage.getItem("index.json")) as
    | { recipes: RecipeIndex }
    | undefined;
  const indexParsed: { recipes: RecipeIndex } = index ?? { recipes: {} };
  const parsed = new Recipe(body.recipe.trim());
  const name = decodedPath.split("/").pop()!;
  indexParsed.recipes[decodedPath.replace("/", ":")] = {
    name,
    title: parsed.metadata.title || name,
    dir: decodedPath.split("/").slice(0, -1).join("/"),
    servings: parsed.servings ?? 1,
    tags: parsed.metadata.tags || [],
  };
  await storage.setItem("index.json", indexParsed);

  return "Recipe saved";
});

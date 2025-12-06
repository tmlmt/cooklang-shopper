import {
  deleteFromRecipeIndex,
  updateRecipeIndex,
} from "~~/server/utils/recipeIndex";

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
  if (body.fileName === undefined || body.dir === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "No data to patch was provided for the recipe",
    });
  }
  if (body.fileName.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "An empty filename was provided",
    });
  }
  if (body.fileName.includes("/")) {
    throw createError({
      statusCode: 400,
      statusMessage: "A recipe filename cannot contain '/'",
    });
  }

  // Saving
  const storage = useStorage("recipes");
  const oldRecipeKey = decodedPath.replace(/\//g, ":");
  const content = (await storage.getItem(oldRecipeKey + ".cook")) as string;
  if (!content) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }
  await storage.removeItem(oldRecipeKey + ".cook");
  deleteFromRecipeIndex(oldRecipeKey);

  const dir = body.dir;
  const fileName = body.fileName;
  const newRecipeKey = (dir ? `${dir}/${fileName}` : fileName).replace(
    /\//g,
    ":",
  );
  await storage.setItem(newRecipeKey + ".cook", content);
  updateRecipeIndex(newRecipeKey, content);

  return "Recipe saved";
});

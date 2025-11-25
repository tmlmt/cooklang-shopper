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
  const content = await storage.getItem(decodedPath + ".cook");

  if (!content) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  return content as string;
});

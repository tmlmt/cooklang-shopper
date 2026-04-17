export default defineEventHandler(async (event) => {
  await requireSharePermission(event);

  const recipePath = getRouterParam(event, "path");
  if (!recipePath) {
    throw createError({
      statusCode: 400,
      statusMessage: "Recipe path is required",
    });
  }

  const visibility = await getRecipeVisibility(recipePath);
  return { visibility };
});

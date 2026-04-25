export default defineEventHandler(async (event) => {
  await requireSharePermission(event);

  const recipePath = getRouterParam(event, "path");
  if (!recipePath) {
    throw createError({
      status: 400,
      statusText: "Recipe path is required",
    });
  }

  const visibility = await getRecipeVisibility(recipePath);
  return { visibility };
});

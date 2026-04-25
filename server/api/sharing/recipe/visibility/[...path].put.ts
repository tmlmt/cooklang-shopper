export default defineEventHandler(async (event) => {
  await requireSharePermission(event);

  const recipePath = getRouterParam(event, "path");
  if (!recipePath) {
    throw createError({
      status: 400,
      statusText: "Recipe path is required",
    });
  }

  const body = await readBody(event);
  if (!body.visibility || !["public", "private"].includes(body.visibility)) {
    throw createError({
      status: 400,
      statusText: "visibility must be 'public' or 'private'",
    });
  }

  await setRecipeVisibility(recipePath, body.visibility);
  return { visibility: body.visibility };
});

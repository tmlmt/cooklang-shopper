export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const recipePath = getRouterParam(event, "path");
  if (!recipePath) {
    throw createError({
      statusCode: 400,
      statusMessage: "Recipe path is required",
    });
  }

  const body = await readBody(event);
  if (!body.visibility || !["public", "private"].includes(body.visibility)) {
    throw createError({
      statusCode: 400,
      statusMessage: "visibility must be 'public' or 'private'",
    });
  }

  await setRecipeVisibility(recipePath, body.visibility);
  return { visibility: body.visibility };
});

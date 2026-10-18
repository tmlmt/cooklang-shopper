import { defineEventHandler, getRouterParam, readBody } from "nuxt/server";
import type { Visibility } from "#shared/types";

export default defineEventHandler(async (event) => {
  await requireSharePermission(event);

  const recipePath = getRouterParam(event, "path");
  if (!recipePath) {
    throw createError({
      status: 400,
      statusText: "Recipe path is required",
    });
  }

  const body = await readBody<{ visibility: string }>(event);
  if (!body.visibility || !["public", "private"].includes(body.visibility)) {
    throw createError({
      status: 400,
      statusText: "visibility must be 'public' or 'private'",
    });
  }

  await setRecipeVisibility(recipePath, body.visibility as Visibility);
  return { visibility: body.visibility };
});

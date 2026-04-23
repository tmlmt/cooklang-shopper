import type { RecipeChoicesWire } from "~~/shared/types";

interface AddRecipeBody {
  path: string;
  servings: number;
  choices?: RecipeChoicesWire;
}

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<AddRecipeBody>(event);

  if (!body.path || typeof body.path !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "path is required",
    });
  }
  validateRecipePath(body.path);
  if (
    !body.servings ||
    typeof body.servings !== "number" ||
    body.servings < 1
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "servings must be a positive number",
    });
  }

  const choices = body.choices ? toRecipeChoices(body.choices) : undefined;

  await addRecipeToList(userKey, body.path, body.servings, choices);
  return getShoppingListData(userKey);
});

import { getUserKey } from "~~/server/utils/auth";
import { toRecipeChoices } from "~~/shared/utils/recipeChoices";
import {
  updateRecipeInList,
  getShoppingListData,
} from "~~/server/utils/shoppingIndex";
import { validateRecipePath } from "~~/shared/utils/path";
import type { RecipeChoicesWire } from "~~/shared/types";

interface UpdateRecipeBody {
  path: string;
  servings: number;
  choices?: RecipeChoicesWire;
}

export default defineEventHandler(async (event) => {
  const session = await requireShoppingAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<UpdateRecipeBody>(event);

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

  await updateRecipeInList(userKey, body.path, body.servings, choices);
  return getShoppingListData(userKey);
});

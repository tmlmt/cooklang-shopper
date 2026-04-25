import type { RecipeChoicesWire } from "~~/shared/types";

interface UpdateRecipeBody {
  path: string;
  servings: number;
  choices?: RecipeChoicesWire;
}

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined;
  let userKey: string;
  let listName: string;

  if (token) {
    await requireUserSession(event);
    const ctx = await resolveShoppingShareToken(token);
    userKey = ctx.userKey;
    listName = ctx.listName;
  } else {
    const session = await requireShoppingAccess(event);
    userKey = getUserKey(session);
    listName = "";
  }

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

  await updateRecipeInList(
    userKey,
    body.path,
    body.servings,
    choices,
    listName,
  );
  return getShoppingListData(userKey, listName);
});

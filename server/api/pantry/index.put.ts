import { Pantry } from "@tmlmt/cooklang-parser";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);

  const body = await readBody<{ content: string }>(event);

  if (typeof body?.content !== "string") {
    throw createError({ status: 400, statusText: "content is required" });
  }

  try {
    new Pantry(body.content);
  } catch (err: unknown) {
    throw createError({ status: 422, message: (err as Error).message });
  }

  await writePantryFile(userKey, body.content);
  applyPantryToUserLists(userKey, body.content);
});

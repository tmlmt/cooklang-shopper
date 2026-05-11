import { CategoryConfig } from "@tmlmt/cooklang-parser";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);

  const body = await readBody<{ content: string }>(event);

  if (typeof body?.content !== "string") {
    throw createError({ status: 400, statusText: "content is required" });
  }

  try {
    new CategoryConfig(body.content);
  } catch (err: unknown) {
    throw createError({ status: 422, message: (err as Error).message });
  }

  await writeCategoryConfigFile(userKey, body.content);
  applyCategoryConfigToUserLists(userKey, body.content);
});

import { loginStore } from "#server/utils/onlineStore/service";

export default defineEventHandler(async (event) => {
  const session = await requireCartAccess(event);
  const userKey = getUserKey(session);

  const body = await readBody<{ username?: string; password?: string }>(event);
  if (!body?.username || !body?.password) {
    throw createError({
      status: 400,
      statusText: "username and password are required",
    });
  }

  return loginStore(userKey, {
    username: body.username,
    password: body.password,
  });
});

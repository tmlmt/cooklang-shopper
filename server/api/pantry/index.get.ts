export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userKey = getUserKey(session);
  return { content: (await readPantryFile(userKey)) ?? "" };
});

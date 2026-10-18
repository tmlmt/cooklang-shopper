// h3 dependance:
// Uses h3's createEventStream for server-sent events

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined;
  let userKey: string;

  if (token) {
    const ctx = await resolveShoppingShareToken(token);
    userKey = ctx.userKey;
  } else {
    const session = await requireShoppingAccess(event);
    userKey = getUserKey(session);
  }

  const stream = createEventStream(event);
  registerStream(userKey, stream);

  stream.onClosed(async () => {
    unregisterStream(userKey, stream);
  });

  return stream.send();
});

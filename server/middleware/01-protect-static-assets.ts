import { getRequestURL } from "h3";

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;

  const isProtectedStaticPath = /^\/(recipes|config)(\/|$)/.test(pathname);
  if (!isProtectedStaticPath) {
    return;
  }

  await requireUserSession(event);
});

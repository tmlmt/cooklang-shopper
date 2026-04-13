import { getRequestURL } from "h3";
import { isRecipePublic } from "~~/server/utils/recipeVisibility";

// Extract the recipe key (colon-separated) from a static asset path.
// e.g. "/recipes/mains/gratin.jpg" → "mains:gratin"
// e.g. "/_ipx/w_200/recipes/desserts/cake.2.png" → "desserts:cake"
function extractRecipeKey(pathname: string): string | undefined {
  // Strip /_ipx/... prefix and /recipes/ prefix to get relative path
  const match = pathname.match(/\/recipes\/(.+)/);
  if (!match) return undefined;

  const relative = decodeURIComponent(match[1]!);
  const lastSlash = relative.lastIndexOf("/");
  const dir = lastSlash >= 0 ? relative.substring(0, lastSlash) : "";
  let filename = lastSlash >= 0 ? relative.substring(lastSlash + 1) : relative;

  // Strip file extension
  const dotIndex = filename.indexOf(".");
  if (dotIndex > 0) {
    filename = filename.substring(0, dotIndex);
  }

  const recipePath = dir ? `${dir}/${filename}` : filename;
  return recipePath.replace(/\//g, ":");
}

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;

  // /config paths are always protected
  const isConfigPath =
    /^\/config(\/|$)/.test(pathname) ||
    /^\/_ipx\/.*\/config(\/|$)/.test(pathname);
  if (isConfigPath) {
    await requireUserSession(event);
    return;
  }

  // Check if this is a recipe static asset path
  const isRecipePath =
    /^\/recipes(\/|$)/.test(pathname) ||
    /^\/_ipx\/.*\/recipes(\/|$)/.test(pathname);
  if (!isRecipePath) {
    return;
  }

  // If user is authenticated, allow all recipe assets
  if (await isAuthenticated(event)) {
    return;
  }

  // Check per-recipe visibility from the asset path
  const recipeKey = extractRecipeKey(pathname);
  if (recipeKey && (await isRecipePublic(recipeKey))) {
    return;
  }

  // Allow access if the recipe has an active (non-expired) share link
  if (recipeKey) {
    const db = getDb();
    const activeShareLink = await db.shareLink.findFirst({
      where: {
        recipePath: recipeKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (activeShareLink) {
      return;
    }
  }

  await requireUserSession(event);
});

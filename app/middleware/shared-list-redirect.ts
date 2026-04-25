import type { NuxtError } from "#app";

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn } = useUserSession();
  if (!loggedIn.value) return;

  const token = to.params.token as string;
  const sharedListStore = useSharedListStore();

  if (import.meta.server) {
    try {
      const data = await $fetchWithHeaders<{
        ownerName: string;
        expiresAt: string | null;
      }>(`/api/sharing/list/resolve/${token}`);
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        return abortNavigation(
          createError({ status: 410, statusText: "Share link expired" }),
        );
      }
      sharedListStore.setSharedList(token, data.ownerName, data.expiresAt);
    } catch (e: unknown) {
      const error = e as NuxtError;
      return abortNavigation(
        createError({
          status: error.status ?? 404,
          statusText: error.statusText ?? "Share link not found",
        }),
      );
    }
    // No redirect on server — let page render so Pinia state is serialized into payload
    return;
  }

  // Client branch: store may already be hydrated from SSR payload (initial load),
  // or needs populating for client-side navigation to this route.
  if (sharedListStore.token !== token) {
    try {
      const data = await $fetchWithHeaders<{
        ownerName: string;
        expiresAt: string | null;
      }>(`/api/sharing/list/resolve/${token}`);
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        return abortNavigation(
          createError({ status: 410, statusText: "Share link expired" }),
        );
      }
      sharedListStore.setSharedList(token, data.ownerName, data.expiresAt);
    } catch (e: unknown) {
      const error = e as NuxtError;
      return abortNavigation(
        createError({
          status: error.status ?? 404,
          statusText: error.statusText ?? "Share link not found",
        }),
      );
    }
  }

  clearNuxtData("shopping-list");
  return navigateTo("/list");
});

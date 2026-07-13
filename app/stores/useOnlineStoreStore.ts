import type {
  OnlineStoreItem,
  OnlineStoreStatus,
  OnlineStoreSyncResult,
} from "~~/shared/types";

export const useOnlineStoreStore = defineStore("onlineStore", () => {
  const configured = ref(false);
  const connected = ref(false);
  const provider = ref<string | undefined>(undefined);
  const lastSent = ref<OnlineStoreItem[]>([]);

  function apply(status: OnlineStoreStatus) {
    configured.value = status.configured;
    connected.value = status.connected;
    provider.value = status.provider;
    lastSent.value = status.lastSent;
  }

  async function fetchStatus() {
    const status = await $fetchWithHeaders<OnlineStoreStatus>(
      "/api/online-store/status",
    );
    apply(status);
  }

  async function login(username: string, password: string) {
    const status = await $fetchWithHeaders<OnlineStoreStatus>(
      "/api/online-store/login",
      { method: "POST", body: { username, password } },
    );
    apply(status);
  }

  async function logout() {
    await $fetchWithHeaders("/api/online-store/logout", { method: "POST" });
    connected.value = false;
    lastSent.value = [];
  }

  async function syncCart(items: OnlineStoreItem[]) {
    const result = await $fetchWithHeaders<OnlineStoreSyncResult>(
      "/api/online-store/cart",
      { method: "POST", body: { items } },
    );
    lastSent.value = result.lastSent;
    return result;
  }

  async function clearCart() {
    const result = await $fetchWithHeaders<OnlineStoreSyncResult>(
      "/api/online-store/cart",
      { method: "DELETE" },
    );
    lastSent.value = result.lastSent;
    return result;
  }

  return {
    configured,
    connected,
    provider,
    lastSent,
    fetchStatus,
    login,
    logout,
    syncCart,
    clearCart,
  };
});

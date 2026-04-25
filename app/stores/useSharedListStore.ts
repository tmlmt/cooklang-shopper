export const useSharedListStore = defineStore("shared-list", () => {
  const token = ref<string | null>(null);
  const ownerName = ref<string | null>(null);
  const expiresAt = ref<string | null>(null);

  function setSharedList(
    t: string,
    owner: string,
    expires: string | null,
  ): void {
    token.value = t;
    ownerName.value = owner;
    expiresAt.value = expires;
  }

  function clearSharedList(): void {
    token.value = null;
    ownerName.value = null;
    expiresAt.value = null;
  }

  return { token, ownerName, expiresAt, setSharedList, clearSharedList };
});

export const useCatalogStore = defineStore("catalog", () => {
  const rawCatalog = ref<string>("");

  async function fetchCatalog() {
    // only fetch if the catalog is empty
    if (rawCatalog.value) return;

    const data = await $fetchWithHeaders<string>("/api/catalog");
    if (data) {
      rawCatalog.value = data;
    }
  }

  return { rawCatalog, fetchCatalog };
});

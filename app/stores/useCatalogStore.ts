export const useCatalogStore = defineStore("catalog", () => {
  const rawCatalog = ref<string>("");

  async function fetchCatalog() {
    // only fetch if the catalog is empty
    if (rawCatalog.value) return;

    const { data } = await useFetch<string>("/api/catalog");
    if (data.value) {
      rawCatalog.value = data.value;
    }
  }

  return { rawCatalog, fetchCatalog };
});
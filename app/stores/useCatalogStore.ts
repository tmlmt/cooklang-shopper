export const useCatalogStore = defineStore("catalog", () => {
  const rawCatalog = ref<string>("");

  async function fetchCatalog() {
    // only fetch if the catalog is empty
    if (rawCatalog.value) return;

    const data = await $fetchWithHeaders<{ content: string }>("/api/catalog");
    if (data) {
      rawCatalog.value = data.content;
    }
  }

  async function saveCatalog(content: string) {
    const data = await $fetchWithHeaders<{ content: string }>("/api/catalog", {
      method: "PUT",
      body: { content },
    });
    rawCatalog.value = data.content;
  }

  return { rawCatalog, fetchCatalog, saveCatalog };
});

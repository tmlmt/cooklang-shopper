import { ProductCatalog, type ProductOption } from "@tmlmt/cooklang-parser";

export default async function () {
  const products = ref<ProductOption[]>([]);

  const catalogStore = useCatalogStore();
  await catalogStore.fetchCatalog();

  function getCatalogObject() {
    const catalog = new ProductCatalog();
    catalog.parse(catalogStore.rawCatalog);
    return catalog;
  }

  watchEffect(() => {
    if (catalogStore.rawCatalog) {
      products.value = getCatalogObject().products;
    }
  });

  return { products, getCatalogObject };
}

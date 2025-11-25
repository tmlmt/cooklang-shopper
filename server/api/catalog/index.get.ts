export default defineEventHandler(async () => {
  const storage = useStorage("config");
  const catalogFileName = "product-catalog.toml";

  const content = (await storage.getItem(catalogFileName)) as string;

  // Initiatize the product catalog if it doesn't exist
  if (!content) {
    await storage.setItem(catalogFileName, "");
  }
  return content;
});

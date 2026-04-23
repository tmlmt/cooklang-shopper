export default defineNitroPlugin(async () => {
  try {
    await initShoppingIndex();
  } catch (err) {
    console.error("Failed to initialize shopping index:", err);
  }
});

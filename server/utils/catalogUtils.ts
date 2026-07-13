function getCatalogKey(userKey: string): string {
  return `catalog.${userKey}.toml`;
}

export async function readCatalogFile(
  userKey: string,
): Promise<string | undefined> {
  const content = await useStorage("catalog").getItem(getCatalogKey(userKey));
  return content ? (content as string) : undefined;
}

export async function writeCatalogFile(
  userKey: string,
  content: string,
): Promise<void> {
  await useStorage("catalog").setItem(getCatalogKey(userKey), content);
}

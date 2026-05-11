import { useStorage } from "nitropack/runtime";

function getCategoryConfigKey(userKey: string): string {
  return `category-config.${userKey}.conf`;
}

export async function readCategoryConfigFile(
  userKey: string,
): Promise<string | undefined> {
  const content = await useStorage("categories").getItem(
    getCategoryConfigKey(userKey),
  );
  return content ? (content as string) : undefined;
}

export async function writeCategoryConfigFile(
  userKey: string,
  content: string,
): Promise<void> {
  await useStorage("categories").setItem(
    getCategoryConfigKey(userKey),
    content,
  );
}

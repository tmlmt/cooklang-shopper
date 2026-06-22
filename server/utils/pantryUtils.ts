function getPantryKey(userKey: string): string {
  return `pantry.${userKey}.conf`;
}

export async function readPantryFile(
  userKey: string,
): Promise<string | undefined> {
  const content = await useStorage("pantry").getItem(getPantryKey(userKey));
  return content ? (content as string) : undefined;
}

export async function writePantryFile(
  userKey: string,
  content: string,
): Promise<void> {
  await useStorage("pantry").setItem(getPantryKey(userKey), content);
}

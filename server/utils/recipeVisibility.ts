import { getAppConfig } from "#server/utils/appConfig";

type Visibility = "public" | "private";

async function getDefaultVisibility(): Promise<Visibility> {
  const config = await getAppConfig();
  return config.sharing?.defaultVisibility ?? "private";
}

export async function getRecipeVisibility(
  recipePath: string,
): Promise<Visibility> {
  const db = getDb();
  const record = await db.recipeVisibility.findUnique({
    where: { recipePath },
  });
  if (record) return record.visibility as Visibility;
  return getDefaultVisibility();
}

export async function setRecipeVisibility(
  recipePath: string,
  visibility: Visibility,
): Promise<void> {
  const db = getDb();
  await db.recipeVisibility.upsert({
    where: { recipePath },
    update: { visibility },
    create: { recipePath, visibility },
  });
}

export async function isRecipePublic(recipePath: string): Promise<boolean> {
  return (await getRecipeVisibility(recipePath)) === "public";
}

export async function bulkGetVisibility(
  paths: string[],
): Promise<Map<string, Visibility>> {
  const defaultVis = await getDefaultVisibility();
  const db = getDb();
  const overrides = await db.recipeVisibility.findMany({
    where: { recipePath: { in: paths } },
  });

  const overrideMap = new Map(
    overrides.map((o) => [o.recipePath, o.visibility as Visibility]),
  );

  const result = new Map<string, Visibility>();
  for (const p of paths) {
    result.set(p, overrideMap.get(p) ?? defaultVis);
  }
  return result;
}

export async function getPublicRecipePaths(): Promise<Set<string>> {
  const defaultVis = await getDefaultVisibility();
  const db = getDb();

  if (defaultVis === "public") {
    // All recipes are public except those explicitly set to private
    const privateOverrides = await db.recipeVisibility.findMany({
      where: { visibility: "private" },
      select: { recipePath: true },
    });
    const privateSet = new Set(privateOverrides.map((o) => o.recipePath));
    const { getRecipeIndex } = await import("~~/server/utils/recipeIndex");
    const index = getRecipeIndex();
    const publicPaths = new Set<string>();
    for (const key of index.keys()) {
      if (!privateSet.has(key)) publicPaths.add(key);
    }
    return publicPaths;
  }

  // Default is private — only explicitly public recipes
  const publicOverrides = await db.recipeVisibility.findMany({
    where: { visibility: "public" },
    select: { recipePath: true },
  });
  return new Set(publicOverrides.map((o) => o.recipePath));
}

export async function deleteRecipeVisibilityAndLinks(
  recipePath: string,
): Promise<void> {
  const db = getDb();
  try {
    await db.recipeVisibility.delete({ where: { recipePath } });
  } catch (e: unknown) {
    if (!(e instanceof Error && "code" in e && e.code === "P2025")) throw e;
  }
  await db.shareLink.deleteMany({ where: { recipePath } });
}

export async function moveRecipeVisibilityAndLinks(
  oldPath: string,
  newPath: string,
): Promise<void> {
  const db = getDb();
  try {
    await db.recipeVisibility.update({
      where: { recipePath: oldPath },
      data: { recipePath: newPath },
    });
  } catch (e: unknown) {
    if (!(e instanceof Error && "code" in e && e.code === "P2025")) throw e;
  }
  await db.shareLink.updateMany({
    where: { recipePath: oldPath },
    data: { recipePath: newPath },
  });
}

export async function deleteVisibilityAndLinksForDirectory(
  dirPrefix: string,
): Promise<void> {
  const db = getDb();
  await db.recipeVisibility.deleteMany({
    where: { recipePath: { startsWith: dirPrefix } },
  });
  await db.shareLink.deleteMany({
    where: { recipePath: { startsWith: dirPrefix } },
  });
}

export async function moveVisibilityAndLinksForDirectory(
  oldDirPrefix: string,
  newDirPrefix: string,
): Promise<void> {
  const db = getDb();

  const visRecords = await db.recipeVisibility.findMany({
    where: { recipePath: { startsWith: oldDirPrefix } },
  });
  for (const record of visRecords) {
    const newPath = newDirPrefix + record.recipePath.slice(oldDirPrefix.length);
    await db.recipeVisibility.update({
      where: { id: record.id },
      data: { recipePath: newPath },
    });
  }

  const linkRecords = await db.shareLink.findMany({
    where: { recipePath: { startsWith: oldDirPrefix } },
  });
  for (const record of linkRecords) {
    const newPath = newDirPrefix + record.recipePath.slice(oldDirPrefix.length);
    await db.shareLink.update({
      where: { id: record.id },
      data: { recipePath: newPath },
    });
  }
}

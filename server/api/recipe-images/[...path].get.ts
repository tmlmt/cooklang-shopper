import { Recipe } from "@tmlmt/cooklang-parser";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { RecipeImageManifest } from "~~/shared/types";
import {
  IMAGE_EXTENSIONS,
  recipesRoot,
  toWebPathFromFsPath,
} from "~~/server/utils/recipeImages";

const IMAGE_METADATA_KEYS = new Set(["image", "images", "picture", "pictures"]);

type ManifestBuilderContext = {
  recipeName: string;
  recipeDirFsPath: string;
  filesByLowerName: Map<string, string>;
};

function findImplicitCoverImage(
  ctx: ManifestBuilderContext,
): string | undefined {
  for (const ext of IMAGE_EXTENSIONS) {
    const lowerName = `${ctx.recipeName}.${ext}`.toLowerCase();
    const actualName = ctx.filesByLowerName.get(lowerName);
    if (!actualName) continue;

    const fsPath = path.join(ctx.recipeDirFsPath, actualName);
    const webPath = toWebPathFromFsPath(fsPath);
    if (webPath) return webPath;
  }

  return undefined;
}

function collectImplicitStepImages(
  ctx: ManifestBuilderContext,
): Record<string, string> {
  const prefix = `${ctx.recipeName.toLowerCase()}.`;
  const mapping: Record<string, string> = {};

  for (const [lowerName, actualName] of ctx.filesByLowerName.entries()) {
    if (!lowerName.startsWith(prefix)) continue;

    for (const ext of IMAGE_EXTENSIONS) {
      const suffix = `.${ext}`;
      if (!lowerName.endsWith(suffix)) continue;

      const stepChunk = lowerName.slice(prefix.length, -suffix.length);
      if (!/^\d+$/.test(stepChunk)) continue;

      const stepNumber = Number(stepChunk);
      if (!Number.isInteger(stepNumber) || stepNumber <= 0) continue;

      // Keep first match according to extension priority.
      if (mapping[String(stepNumber)]) break;

      const fsPath = path.join(ctx.recipeDirFsPath, actualName);
      const webPath = toWebPathFromFsPath(fsPath);
      if (webPath) {
        mapping[String(stepNumber)] = webPath;
      }
      break;
    }
  }

  return mapping;
}

function collectMetadataImageValues(
  metadata: Record<string, unknown>,
): string[] {
  const values: string[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (!IMAGE_METADATA_KEYS.has(key.toLowerCase())) continue;

    if (typeof value === "string") {
      values.push(value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          values.push(item);
        }
      }
    }
  }

  return values;
}

async function resolveLocalMetadataImage(
  imageValue: string,
  recipeDirFsPath: string,
): Promise<string | undefined> {
  let fsPath: string;

  if (imageValue.startsWith("/recipes/")) {
    fsPath = path.resolve(recipesRoot, imageValue.slice("/recipes/".length));
  } else if (imageValue.startsWith("/")) {
    fsPath = path.resolve(recipesRoot, imageValue.slice(1));
  } else {
    fsPath = path.resolve(recipeDirFsPath, imageValue);
  }

  if (!fsPath.startsWith(recipesRoot + path.sep) && fsPath !== recipesRoot) {
    return undefined;
  }

  try {
    const fileStat = await stat(fsPath);
    if (!fileStat.isFile()) return undefined;
  } catch {
    return undefined;
  }

  return toWebPathFromFsPath(fsPath);
}

async function normalizeMetadataImage(
  rawValue: unknown,
  recipeDirFsPath: string,
): Promise<string | undefined> {
  if (typeof rawValue !== "string") return undefined;

  const imageValue = rawValue.trim();
  if (!imageValue) return undefined;

  if (imageValue.startsWith("http://") || imageValue.startsWith("https://")) {
    return imageValue;
  }

  return resolveLocalMetadataImage(imageValue, recipeDirFsPath);
}

function dedupeInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }

  return deduped;
}

export default defineEventHandler(
  async (event): Promise<RecipeImageManifest> => {
    await requireUserSession(event);

    const decodedPath = getValidatedRecipePath(event);
    const storage = useStorage("recipes");
    const content = await storage.getItem(`${decodedPath}.cook`);

    if (!content) {
      throw createError({
        statusCode: 404,
        statusMessage: "Recipe not found",
      });
    }

    const parsed = new Recipe(String(content));
    const metadata = parsed.metadata as Record<string, unknown>;

    const recipeFsPath = path.join(
      process.cwd(),
      "public",
      "recipes",
      `${decodedPath}.cook`,
    );
    const recipeDirFsPath = path.dirname(recipeFsPath);
    const recipeName = path.basename(decodedPath);

    const dirEntries = await readdir(recipeDirFsPath, { withFileTypes: true });
    const imageFiles = dirEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => {
        const ext = path.extname(name).slice(1).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      });

    const filesByLowerName = new Map<string, string>();
    for (const name of imageFiles) {
      filesByLowerName.set(name.toLowerCase(), name);
    }

    const ctx: ManifestBuilderContext = {
      recipeName,
      recipeDirFsPath,
      filesByLowerName,
    };

    const metadataImageValues = collectMetadataImageValues(metadata);
    const resolvedMetadataImages = (
      await Promise.all(
        metadataImageValues.map((value) =>
          normalizeMetadataImage(value, recipeDirFsPath),
        ),
      )
    ).filter((value): value is string => Boolean(value));

    const implicitCoverImage = findImplicitCoverImage(ctx);
    const stepImagesByNumber = collectImplicitStepImages(ctx);

    const heroImages = dedupeInOrder([
      ...resolvedMetadataImages,
      ...(implicitCoverImage ? [implicitCoverImage] : []),
    ]);

    return {
      coverImage: heroImages[0],
      heroImages,
      stepImagesByNumber,
      hasImages:
        heroImages.length > 0 || Object.keys(stepImagesByNumber).length > 0,
    };
  },
);

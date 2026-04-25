import { Recipe } from "@tmlmt/cooklang-parser";
import type { RecipeImageManifest } from "~~/shared/types";

export default defineEventHandler(
  async (event): Promise<RecipeImageManifest> => {
    const authenticated = await isAuthenticated(event);
    const decodedPath = getValidatedRecipePath(event);

    if (!authenticated) {
      const recipeKey = decodedPath.replace(/\.cook$/, "");
      const isPublic = await isRecipePublic(recipeKey);
      if (!isPublic) {
        throw createError({ status: 401, statusText: "Unauthorized" });
      }
    }

    const storage = useStorage("recipes");
    const content = await storage.getItem(`${decodedPath}.cook`);

    if (!content) {
      throw createError({
        status: 404,
        statusText: "Recipe not found",
      });
    }

    const parsed = new Recipe(String(content));
    const metadata = parsed.metadata as Record<string, unknown>;

    return buildImageManifest(decodedPath, metadata);
  },
);

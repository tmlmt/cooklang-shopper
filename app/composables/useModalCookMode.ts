import type { Recipe, RecipeChoices } from "@tmlmt/cooklang-parser";
import { ModalCookMode } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalCookMode);

  async function open(
    recipe: Recipe,
    choices: RecipeChoices,
    stepImagesByNumber?: Record<string, string>,
  ) {
    const instance = modal.open({ recipe, choices, stepImagesByNumber });
    return await instance.result;
  }

  return { open };
}

import type { Recipe, RecipeChoices } from "@tmlmt/cooklang-parser";
import { ModalCookMode } from "#components";

type TranslateFn = (
  key: string,
  params?: Record<string, string | number | boolean>,
  defaultValue?: string,
) => string;

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalCookMode);

  async function open(
    recipe: Recipe,
    choices: RecipeChoices,
    stepImagesByNumber?: Record<string, string>,
    translate?: TranslateFn,
  ) {
    const instance = modal.open({
      recipe,
      choices,
      stepImagesByNumber,
      translateFunction: translate,
    });
    return await instance.result;
  }

  return { open };
}

import { ModalChoices } from "#components";
import type { Recipe, RecipeChoices } from "@tmlmt/cooklang-parser";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalChoices);

  async function open(
    recipe: Recipe,
    initialVariant?: string,
    initialChoices?: RecipeChoices,
  ): Promise<RecipeChoices | undefined> {
    const instance = modal.open({ recipe, initialVariant, initialChoices });
    return await instance.result;
  }

  return { open };
}

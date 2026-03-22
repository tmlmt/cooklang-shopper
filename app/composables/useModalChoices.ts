import { ModalChoices } from "#components";
import type { Recipe, RecipeChoices } from "@tmlmt/cooklang-parser";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalChoices);

  async function open(
    recipe: Recipe,
    initialVariant?: string,
  ): Promise<RecipeChoices | undefined> {
    const instance = modal.open({ recipe, initialVariant });
    return await instance.result;
  }

  return { open };
}

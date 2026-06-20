import { ModalTranslateRecipe } from "#components";
import type { TranslateResult } from "~/components/ModalTranslateRecipe.vue";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalTranslateRecipe);

  async function open(): Promise<TranslateResult | undefined> {
    const instance = modal.open();
    return await instance.result;
  }

  return { open };
}

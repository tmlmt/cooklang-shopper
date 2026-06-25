import { ModalShareRecipe } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalShareRecipe);

  async function open(recipePath: string, viewingLocale?: string) {
    const instance = modal.open({ recipePath, viewingLocale });
    return await instance.result;
  }

  return { open };
}

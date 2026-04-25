import { ModalShareRecipe } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalShareRecipe);

  async function open(recipePath: string) {
    const instance = modal.open({ recipePath });
    return await instance.result;
  }

  return { open };
}

import { ModalFile } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalFile);

  async function open(
    mode: "new" | "move",
    currentPath?: string,
    title?: string,
  ) {
    const instance = modal.open({ mode, currentPath, title });
    return await instance.result;
  }

  return { open };
}

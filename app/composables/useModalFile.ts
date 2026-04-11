import { ModalFile } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalFile);

  async function open(
    mode: "new" | "move" | "move-folder",
    currentPath?: string,
    title?: string,
    excludePaths?: string[],
  ) {
    const instance = modal.open({ mode, currentPath, title, excludePaths });
    return await instance.result;
  }

  return { open };
}

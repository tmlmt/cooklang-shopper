import { ModalStoreRun } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalStoreRun);

  async function open() {
    const instance = modal.open({});
    return await instance.result;
  }

  return { open };
}

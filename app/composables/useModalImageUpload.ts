import { ModalImageUpload } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalImageUpload);

  async function open(roles: { label: string; value: string }[]) {
    const instance = modal.open({ roles });
    return await instance.result;
  }

  return { open };
}

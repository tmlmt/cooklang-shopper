import { ModalOnlineStoreConnect } from "#components";

export default function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalOnlineStoreConnect);

  async function open(provider: string) {
    const instance = modal.open({ provider });
    return await instance.result;
  }

  return { open };
}

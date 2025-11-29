import { ModalConfirmation } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalConfirmation);

  async function open(question: string, yes?: string, no?: string) {
    const instance = modal.open({ question, yes, no });
    return await instance.result;
  }

  return { open };
}

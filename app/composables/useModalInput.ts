import { ModalInput } from "#components";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalInput);

  async function open(
    title: string,
    label: string,
    placeholder?: string,
    submitLabel?: string,
    initialValue?: string,
  ) {
    const instance = modal.open({
      title,
      label,
      placeholder,
      submitLabel,
      initialValue,
    });
    return await instance.result;
  }

  return { open };
}

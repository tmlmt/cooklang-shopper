import { ModalRecipeLocale } from "#components";
import type { RecipeLocaleResult } from "~/components/ModalRecipeLocale.vue";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalRecipeLocale);

  async function open(
    allLocaleOptions: { code: string | undefined; label: string }[],
    currentRecipeLocale: string | undefined,
    currentAppLocale: string,
  ): Promise<RecipeLocaleResult | undefined> {
    const instance = modal.open({
      allLocaleOptions,
      currentRecipeLocale,
      currentAppLocale,
    });
    return await instance.result;
  }

  return { open };
}

import { ModalRecipeLocale } from "#components";
import type { RecipeLocaleResult } from "~/components/ModalRecipeLocale.vue";
import type { LocaleOption } from "~~/shared/types";

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalRecipeLocale);

  async function open(
    allLocaleOptions: LocaleOption[],
    currentRecipeLocale: string | undefined,
    currentAppLocale: string,
    defaultRecipeLocale: string | undefined,
  ): Promise<RecipeLocaleResult | undefined> {
    const instance = modal.open({
      allLocaleOptions,
      currentRecipeLocale,
      currentAppLocale,
      defaultRecipeLocale,
    });
    return await instance.result;
  }

  return { open };
}

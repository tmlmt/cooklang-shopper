import { ModalStoreRun } from "#components";
import type { AddedIngredient } from "@tmlmt/cooklang-parser";
import type { ShoppingListResponse } from "./useShoppingListActions";

interface StoreRunOptions {
  ingredientsFn?: () => AddedIngredient[];
  isCheckedFn?: (name: string) => boolean;
  onCheckFn?: (name: string, checked: boolean) => void | Promise<void>;
  onUncheckAllFn?: () => void | Promise<void>;
  applyResponseFn?: (data: ShoppingListResponse) => void;
  sseToken?: string;
}

export default async function () {
  const overlay = useOverlay();
  const modal = overlay.create(ModalStoreRun);

  async function open(options?: StoreRunOptions) {
    const instance = modal.open(options ?? {});
    return await instance.result;
  }

  return { open };
}

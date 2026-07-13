import { ShoppingCart } from "@tmlmt/cooklang-parser";
import type {
  CartContent,
  CartMatch,
  CartMisMatch,
  ShoppingCartSummary,
} from "@tmlmt/cooklang-parser";

export default async function () {
  const cart = ref<CartContent>();
  const match = ref<CartMatch>();
  const misMatch = ref<CartMisMatch>();
  const summary = ref<ShoppingCartSummary>({ totalPrice: 0, totalItems: 0 });

  const catalog = await useCatalog();
  const shoppingStore = useShoppingStore();
  const shoppingList = await useShoppingList();

  async function getCartObject() {
    const shoppingCart = new ShoppingCart();
    const shoppingListObject = await shoppingList.getListObject();
    shoppingCart.setShoppingList(shoppingListObject);

    const catalogObject = catalog.getCatalogObject();
    if (catalogObject) {
      shoppingCart.setProductCatalog(catalogObject);
      shoppingCart.buildCart();
    }
    return shoppingCart;
  }

  // Update cart whenever the shopping list or catalog changes
  // -- uses a version counter to address race conditions when multiple updates happen in quick succession
  // -- so that only the latest update is applied to the cart, match, and misMatch refs
  let version = 0;
  watch(
    [
      () => shoppingStore.ingredients,
      () => shoppingStore.manualItems,
      () => catalog.products,
    ],
    async () => {
      const v = ++version;
      const shoppingCart = await getCartObject();
      if (v === version) {
        cart.value = shoppingCart.cart;
        match.value = shoppingCart.match;
        misMatch.value = shoppingCart.misMatch;
        summary.value = shoppingCart.summary;
      }
    },
    { deep: true, immediate: true },
  );

  return { cart, match, misMatch, summary, getCartObject };
}

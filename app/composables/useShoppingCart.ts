import { ShoppingCart } from "@tmlmt/cooklang-parser";
import type {
  CartContent,
  CartMatch,
  CartMisMatch,
} from "@tmlmt/cooklang-parser";

export default async function () {
  const cart = ref<CartContent>();
  const match = ref<CartMatch>();
  const misMatch = ref<CartMisMatch>();

  const catalog = await useCatalog();
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

  watchEffect(async () => {
    const shoppingCart = await getCartObject();
    cart.value = shoppingCart.cart;
    match.value = shoppingCart.match;
    misMatch.value = shoppingCart.misMatch;
  });

  return { cart, match, misMatch, getCartObject };
}

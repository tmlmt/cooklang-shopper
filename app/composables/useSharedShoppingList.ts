export function useSharedShoppingList(
  token: string,
  initialData: ShoppingListResponse,
) {
  const actions = useShoppingListActions({ token });
  actions.applyResponse(initialData);
  return actions;
}

import type { ShoppingListResponse } from "./useShoppingListActions";

export function useShoppingSSE(
  applyResponseFn: (data: ShoppingListResponse) => void,
  token?: string,
) {
  const updateCount = ref(0);
  let eventSource: EventSource | null = null;

  function connect(): void {
    if (!import.meta.client) return;
    disconnect();
    const eventUrl = token
      ? `/api/shopping-list/events?token=${token}`
      : `/api/shopping-list/events`;
    eventSource = new EventSource(eventUrl);
    eventSource.onmessage = (e: MessageEvent) => {
      applyResponseFn(JSON.parse(e.data) as ShoppingListResponse);
      updateCount.value++;
    };
  }

  function disconnect(): void {
    eventSource?.close();
    eventSource = null;
  }

  return { connect, disconnect, updateCount };
}

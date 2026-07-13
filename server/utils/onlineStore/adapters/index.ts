import { nemligAdapter } from "#server/utils/onlineStore/adapters/nemlig";
import type { OnlineStoreAdapter } from "#server/utils/onlineStore/types";

/**
 * Registry of available online-store adapters, keyed by their `id`.
 * To add a new store, implement an {@link OnlineStoreAdapter} and add it here.
 */
const adapters: Record<string, OnlineStoreAdapter> = {
  [nemligAdapter.id]: nemligAdapter,
};

export function getAdapter(id: string): OnlineStoreAdapter | undefined {
  return adapters[id];
}

export function listAdapterIds(): string[] {
  return Object.keys(adapters);
}

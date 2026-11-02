import { nemligAdapter } from "#server/utils/onlineStore/adapters/nemlig";
import { rema1000Adapter } from "#server/utils/onlineStore/adapters/rema1000";
import type { OnlineStoreAdapter } from "#server/utils/onlineStore/types";

/**
 * Registry of available online-store adapters, keyed by their `id`.
 * To add a new store, implement an {@link OnlineStoreAdapter} and add it here.
 */
const adapters: Record<string, OnlineStoreAdapter> = {
  [nemligAdapter.id]: nemligAdapter,
  [rema1000Adapter.id]: rema1000Adapter,
};

export function getAdapter(id: string): OnlineStoreAdapter | undefined {
  return adapters[id];
}

export function listAdapterIds(): string[] {
  return Object.keys(adapters);
}

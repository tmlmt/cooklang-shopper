import { getAppConfig } from "#server/utils/appConfig";
import { getAdapter } from "#server/utils/onlineStore/adapters";
import {
  clearState,
  getState,
  persistState,
  setSession,
} from "#server/utils/onlineStore/registry";
import type {
  OnlineStoreAdapter,
  StoreCredentials,
} from "#server/utils/onlineStore/types";
import type {
  OnlineStoreItem,
  OnlineStoreStatus,
  OnlineStoreSyncResult,
} from "~~/shared/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ResolvedStore {
  adapter: OnlineStoreAdapter;
}

/** Resolve the configured adapter, or undefined if the store is not set up. */
async function resolveStore(): Promise<ResolvedStore | undefined> {
  const config = await getAppConfig();
  const store = config.cart?.store;
  if (!store?.provider) return undefined;

  const adapter = getAdapter(store.provider);
  if (!adapter) return undefined;

  return { adapter };
}

async function lastSentItems(userKey: string): Promise<OnlineStoreItem[]> {
  const state = await getState(userKey);
  if (!state) return [];
  return [...state.lastSent.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function getStoreStatus(
  userKey: string,
): Promise<OnlineStoreStatus> {
  const resolved = await resolveStore();
  if (!resolved) {
    return { configured: false, connected: false, lastSent: [] };
  }
  return {
    configured: true,
    provider: resolved.adapter.id,
    connected: (await getState(userKey)) !== undefined,
    lastSent: await lastSentItems(userKey),
  };
}

export async function loginStore(
  userKey: string,
  credentials: StoreCredentials,
): Promise<OnlineStoreStatus> {
  const resolved = await resolveStore();
  if (!resolved) {
    throw createError({ status: 404, message: "No online store configured" });
  }
  const session = await resolved.adapter.login(credentials);
  await setSession(userKey, session);
  return getStoreStatus(userKey);
}

export async function logoutStore(userKey: string): Promise<void> {
  await clearState(userKey);
}

/**
 * Sync the online basket to match `target`, applying only the differences
 * versus what was last sent. Updates the per-user `lastSent` map so subsequent
 * cart changes push only the delta.
 */
export async function syncCart(
  userKey: string,
  target: OnlineStoreItem[],
): Promise<OnlineStoreSyncResult> {
  const resolved = await resolveStore();
  if (!resolved) {
    throw createError({ status: 404, message: "No online store configured" });
  }
  const state = await getState(userKey);
  if (!state) {
    throw createError({ status: 401, message: "Not connected to the store" });
  }

  const { adapter } = resolved;
  const targetMap = new Map<string, number>();
  for (const item of target) {
    if (item.quantity > 0) targetMap.set(item.productId, item.quantity);
  }

  const productIds = new Set<string>([
    ...state.lastSent.keys(),
    ...targetMap.keys(),
  ]);

  const added: OnlineStoreItem[] = [];
  const removed: OnlineStoreItem[] = [];
  const failed: Array<OnlineStoreItem & { error: string }> = [];

  let first = true;
  for (const productId of productIds) {
    const cur = targetMap.get(productId) ?? 0;
    const prev = state.lastSent.get(productId) ?? 0;
    const delta = cur - prev;
    if (delta === 0) continue;

    if (!first) await sleep(adapter.rateLimitMs);
    first = false;

    try {
      if (delta > 0) {
        await adapter.addToBasket(state.session, productId, delta);
        added.push({ productId, quantity: delta });
      } else {
        await adapter.removeFromBasket(state.session, productId, -delta);
        removed.push({ productId, quantity: -delta });
      }
      if (cur > 0) state.lastSent.set(productId, cur);
      else state.lastSent.delete(productId);
    } catch (err: unknown) {
      failed.push({
        productId,
        quantity: delta,
        error: (err as { message?: string })?.message ?? "Unknown error",
      });
    }
  }

  // Persist the just-synced lastSent diff state and session (an adapter may
  // have refreshed its token in place during the calls above) so a server
  // restart doesn't lose track of what's already in the store's basket.
  await persistState(userKey);

  return { added, removed, failed, lastSent: await lastSentItems(userKey) };
}

/** Remove everything we previously sent from the basket. */
export async function clearCart(
  userKey: string,
): Promise<OnlineStoreSyncResult> {
  return syncCart(userKey, []);
}

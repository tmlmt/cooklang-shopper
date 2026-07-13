import type { StoreSession } from "#server/utils/onlineStore/types";

/**
 * Per-user online-store state, held in memory only (single-instance, ephemeral).
 * - `session`: the authenticated store session (cookies).
 * - `lastSent`: the basket state we last successfully pushed to the store,
 *   keyed by productId, used to compute diffs when the cart changes.
 */
interface UserStoreState {
  session: StoreSession;
  lastSent: Map<string, number>;
}

const states = new Map<string, UserStoreState>();

export function getState(userKey: string): UserStoreState | undefined {
  return states.get(userKey);
}

export function setSession(userKey: string, session: StoreSession): void {
  const existing = states.get(userKey);
  if (existing) {
    existing.session = session;
  } else {
    states.set(userKey, { session, lastSent: new Map() });
  }
}

export function clearState(userKey: string): void {
  states.delete(userKey);
}

export function isConnected(userKey: string): boolean {
  return states.has(userKey);
}

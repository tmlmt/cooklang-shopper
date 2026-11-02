import type { StoreSession } from "#server/utils/onlineStore/types";

/**
 * Per-user online-store state: `session` (the authenticated store
 * session — cookies/tokens — plus whatever adapter-specific extra fields it
 * carries, e.g. Rema's list id and item map) and `lastSent` (the basket
 * state we last successfully pushed to the store, keyed by productId, used
 * to compute diffs when the cart changes).
 *
 * Persisted to disk (see {@link storageKey}) so a connection survives a
 * server restart, not just page reloads within one running process. An
 * in-memory map still backs every read/write as a fast-path cache, so
 * callers can keep mutating `state.session`/`state.lastSent` in place (as
 * `service.ts` already does) and only need to call {@link persistState}
 * once they're done, rather than restructure around an async store on every
 * single field access.
 *
 * `session` must stay JSON-serializable end to end (including any
 * adapter-specific extra fields) — a `Map` anywhere in that tree would
 * silently serialize to `{}` and lose data.
 */
interface UserStoreState {
  session: StoreSession;
  lastSent: Map<string, number>;
}

/** The on-disk shape: `lastSent` as a plain object, since `Map` isn't JSON-safe. */
interface PersistedUserStoreState {
  session: StoreSession;
  lastSent: Record<string, number>;
}

const states = new Map<string, UserStoreState>();

function storageKey(userKey: string): string {
  return `online-store-session.${userKey}.json`;
}

async function loadFromDisk(
  userKey: string,
): Promise<UserStoreState | undefined> {
  const raw = await useStorage("onlineStoreSessions").getItem<string>(
    storageKey(userKey),
  );
  if (!raw) return undefined;
  try {
    const parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as PersistedUserStoreState)
        : (raw as PersistedUserStoreState);
    return {
      session: parsed.session,
      lastSent: new Map(Object.entries(parsed.lastSent)),
    };
  } catch {
    // Malformed/unreadable file: treat as not connected, same as if the
    // user had never connected, rather than throwing.
    return undefined;
  }
}

async function saveToDisk(
  userKey: string,
  state: UserStoreState,
): Promise<void> {
  const persisted: PersistedUserStoreState = {
    session: state.session,
    lastSent: Object.fromEntries(state.lastSent),
  };
  await useStorage("onlineStoreSessions").setItem(
    storageKey(userKey),
    JSON.stringify(persisted),
  );
}

async function removeFromDisk(userKey: string): Promise<void> {
  await useStorage("onlineStoreSessions").removeItem(storageKey(userKey));
}

export async function getState(
  userKey: string,
): Promise<UserStoreState | undefined> {
  const cached = states.get(userKey);
  if (cached) return cached;

  const loaded = await loadFromDisk(userKey);
  if (loaded) states.set(userKey, loaded);
  return loaded;
}

export async function setSession(
  userKey: string,
  session: StoreSession,
): Promise<void> {
  const existing = states.get(userKey) ?? (await loadFromDisk(userKey));
  const next: UserStoreState = existing
    ? { ...existing, session }
    : { session, lastSent: new Map() };
  states.set(userKey, next);
  await saveToDisk(userKey, next);
}

/**
 * Persist a user's current in-memory state to disk. Call this after
 * mutating `state.session`/`state.lastSent` in place (e.g. after a cart
 * sync, or a token refresh an adapter performed mid-request) so those
 * changes survive a restart too.
 */
export async function persistState(userKey: string): Promise<void> {
  const state = states.get(userKey);
  if (state) await saveToDisk(userKey, state);
}

export async function clearState(userKey: string): Promise<void> {
  states.delete(userKey);
  await removeFromDisk(userKey);
}

export async function isConnected(userKey: string): Promise<boolean> {
  return (await getState(userKey)) !== undefined;
}

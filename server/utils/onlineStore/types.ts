/**
 * Types for the pluggable online-store integration.
 *
 * An adapter connects Cooklang Shopper to a real online grocery store by
 * translating cart operations into the store's own web API. All outbound HTTP
 * must go through {@link safeFetch} to keep SSRF protection in place.
 *
 * To add support for a new store, implement {@link OnlineStoreAdapter} in
 * `server/utils/onlineStore/adapters/<store>.ts`, register it in
 * `server/utils/onlineStore/adapters/index.ts`, and open a PR. See the
 * "Online store adapters" section of the README for details.
 */

/** Credentials supplied by the user to authenticate against the store. */
export interface StoreCredentials {
  username: string;
  password: string;
}

/**
 * Opaque, per-user session returned by {@link OnlineStoreAdapter["login"]} and
 * passed back to subsequent basket operations. Kept server-side only.
 */
export interface StoreSession {
  /** Raw Set-Cookie values captured at login, replayed on later calls. */
  cookies: string[];
  /** Epoch millis when the session was created. */
  createdAt: number;
}

/**
 * Contract every online-store integration must fulfil.
 *
 * The service layer builds add / remove / clear / diff-sync on top of the two
 * basket primitives below, so an adapter only needs to know how to log in and
 * how to change the quantity of a single product in the basket.
 */
export interface OnlineStoreAdapter {
  /** Unique adapter id, referenced by `cart.store.provider` in config.yaml. */
  readonly id: string;
  /** Minimum delay between sequential store calls (poor-man's rate limiting). */
  readonly rateLimitMs: number;
  /** Direct URL to the basket page in the store's website, shown to the user after sending the cart. */
  readonly cartUrl: string;

  /** Authenticate and return a session usable for basket operations. */
  login(credentials: StoreCredentials): Promise<StoreSession>;

  /** Add `quantity` units of `productId` to the basket. */
  addToBasket(
    session: StoreSession,
    productId: string,
    quantity: number,
  ): Promise<void>;

  /** Remove `quantity` units of `productId` from the basket. */
  removeFromBasket(
    session: StoreSession,
    productId: string,
    quantity: number,
  ): Promise<void>;
}

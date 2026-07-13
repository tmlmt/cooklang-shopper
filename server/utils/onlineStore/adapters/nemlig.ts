import { jsonPost } from "#server/utils/onlineStore/adapterHelpers";
import type {
  OnlineStoreAdapter,
  StoreCredentials,
} from "#server/utils/onlineStore/types";

const BASE_URL = "https://www.nemlig.com/webapi";
const CART_URL = "https://www.nemlig.com/basket";

const nemligOptions = {
  extractError: (body: unknown) =>
    (body as { ErrorMessage?: string })?.ErrorMessage,
};

/**
 * Adapter for nemlig.com, based on the reverse-engineered web API
 * (https://github.com/schourode/nemlig). The store uses cookie-based sessions
 * and a single signed-quantity basket endpoint.
 */
export const nemligAdapter: OnlineStoreAdapter = {
  id: "nemlig",
  rateLimitMs: 1000,
  cartUrl: CART_URL,

  async login(credentials: StoreCredentials) {
    const response = await jsonPost(
      `${BASE_URL}/login/login`,
      {
        Username: credentials.username,
        Password: credentials.password,
        AppInstalled: false,
        AutoLogin: false,
        CheckForExistingProducts: true,
        DoMerge: true,
      },
      undefined,
      nemligOptions,
    );

    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length === 0) {
      throw createError({
        status: 502,
        message: "Store login did not return a session",
      });
    }

    return { cookies, createdAt: Date.now() } satisfies StoreSession;
  },

  async addToBasket(session, productId, quantity) {
    await jsonPost(
      `${BASE_URL}/basket/AddToBasket`,
      { productId, quantity },
      session,
      nemligOptions,
    );
  },

  async removeFromBasket(session, productId, quantity) {
    // nemlig's AddToBasket accepts a negative quantity to decrement.
    await jsonPost(
      `${BASE_URL}/basket/AddToBasket`,
      { productId, quantity: -Math.abs(quantity) },
      session,
      nemligOptions,
    );
  },
};

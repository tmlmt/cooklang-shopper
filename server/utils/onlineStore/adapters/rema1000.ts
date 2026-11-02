import {
  cookieHeader,
  findCookieValue,
  followRedirectChain,
  mergeSetCookies,
  upsertCookie,
} from "#server/utils/onlineStore/cookieSession";
import { bearerRequest } from "#server/utils/onlineStore/bearerAuth";
import {
  pkceCodeChallenge,
  randomPkceString,
} from "#server/utils/onlineStore/pkce";
import { decodeJwtSubject } from "#server/utils/onlineStore/jwt";
import { safeFetch } from "#server/utils/safeFetch";
import type {
  OnlineStoreAdapter,
  StoreCredentials,
  StoreSession,
} from "#server/utils/onlineStore/types";

/**
 * Adapter for shop.rema1000.dk, built on its reverse-engineered web API.
 *
 * Unlike most adapters, login is a full OAuth2 Authorization Code + PKCE
 * dance spread across several domains (cphapp.rema1000.dk for credentials,
 * api.digital.rema1000.dk as the OAuth/Passport server, shop.rema1000.dk for
 * the final callback) and several redirects that each reissue a session
 * cookie. We replicate the exact client-side logic the shop's own frontend
 * uses (decompiled from its JS bundle): generate our own PKCE pair, carry a
 * cookie jar across every hop, and read the resulting access_token and
 * refresh_token cookies set by the callback. The cart API below sends that
 * access token value as a bearer credential on every request.
 */

const ROOT = "https://api.digital.rema1000.dk";
const AUTHORIZE_URL = `${ROOT}/api/oauth2/authorize`;
const LOGIN_URL = "https://cphapp.rema1000.dk/api/oauth2/login";
const REFRESH_URL = "https://shop.rema1000.dk/api/auth/refresh";
const CART_URL = "https://shop.rema1000.dk/";
const CLIENT_ID = "rema1000-shop";
const REDIRECT_URI = "https://shop.rema1000.dk/api/auth/callback/rema";
const STORE_ID = 1;

/**
 * Headers the real shop.rema1000.dk frontend sends on every call to
 * api.digital.rema1000.dk. Confirmed empirically that x-device, x-locale and
 * x-timezone are all required together: the API rejects an otherwise-valid
 * request with a 422 (checked before authentication) if any one is missing.
 */
const REMA_API_HEADERS: Record<string, string> = {
  origin: "https://shop.rema1000.dk",
  referer: "https://shop.rema1000.dk/",
  "x-device": "web",
  "x-locale": "da",
  "x-timezone": "Copenhagen/Europe",
};

/** Surface a Laravel-style `{ message }` validation error instead of a generic status-code message. */
function extractRemaErrorMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}

/**
 * Session extended with Rema-specific state. Kept as a single mutable object
 * (cast back from {@link StoreSession} in the methods below) so that token
 * refreshes and basket-item bookkeeping persist across calls without needing
 * changes to the shared service layer. Plain-object (not Map) so the whole
 * session round-trips through JSON.stringify/parse for persistence.
 */
interface RemaSession extends StoreSession {
  listId: number;
  /** store_item_id -> the list's own item id + current absolute quantity. */
  items: Record<string, { itemId: number; amount: number }>;
}

async function fetchPrimaryListId(
  token: string,
  userId: string,
): Promise<number> {
  const data = await bearerRequest<{
    data: Array<{ id: number; is_primary: boolean }>;
  }>(
    `${ROOT}/api/v3/users/${userId}/shopping-lists?per_page=100&include=users,items_count&sort=-latest_activity_at`,
    token,
    { headers: REMA_API_HEADERS, extractError: extractRemaErrorMessage },
  );
  const list = data.data.find((l) => l.is_primary) ?? data.data[0];
  if (!list) {
    throw createError({
      status: 502,
      message: "No Rema 1000 shopping list found for this account",
    });
  }
  return list.id;
}

async function fetchItemMap(
  token: string,
  listId: number,
): Promise<Record<string, { itemId: number; amount: number }>> {
  const data = await bearerRequest<{
    items: Array<{ id: number; store_item_id: number; amount: number }>;
  }>(`${ROOT}/api/v2/shoppinglists/${listId}?with=items`, token, {
    headers: REMA_API_HEADERS,
    extractError: extractRemaErrorMessage,
  });

  const map: Record<string, { itemId: number; amount: number }> = {};
  for (const item of data.items) {
    map[String(item.store_item_id)] = {
      itemId: item.id,
      amount: item.amount,
    };
  }
  return map;
}

/** Ask shop.rema1000.dk's own backend for a new access token using the stored refresh cookie. */
async function refreshAccessToken(session: RemaSession): Promise<string> {
  const response = await safeFetch(REFRESH_URL, {
    method: "POST",
    headers: { cookie: cookieHeader(session.cookies) },
  });
  session.cookies = mergeSetCookies(session.cookies, response);

  if (!response.ok) {
    throw createError({
      status: 401,
      message: "Rema 1000 session expired, please reconnect",
    });
  }

  const data = (await response.json().catch(() => ({}))) as {
    tokens?: { access_token?: string };
  };
  const token =
    data.tokens?.access_token ??
    findCookieValue(session.cookies, "access_token");
  if (!token) {
    throw createError({
      status: 401,
      message: "Rema 1000 session expired, please reconnect",
    });
  }
  // The refresh response may return the new token only in its JSON body
  // without reissuing the cookie itself — keep the jar in sync regardless,
  // so later calls reading session.cookies don't pick up a stale value.
  session.cookies = upsertCookie(session.cookies, "access_token", token);
  return token;
}

/** Call the cart API, refreshing the access token once and retrying on a 401. */
async function remaRequest<T>(
  session: RemaSession,
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  let token = findCookieValue(session.cookies, "access_token");
  if (!token) token = await refreshAccessToken(session);

  const requestOptions = {
    ...options,
    headers: REMA_API_HEADERS,
    extractError: extractRemaErrorMessage,
  };

  try {
    return await bearerRequest<T>(`${ROOT}${path}`, token, requestOptions);
  } catch (err: unknown) {
    if ((err as { status?: number })?.status !== 401) throw err;
    token = await refreshAccessToken(session);
    return await bearerRequest<T>(`${ROOT}${path}`, token, requestOptions);
  }
}

export const rema1000Adapter: OnlineStoreAdapter = {
  id: "rema1000",
  rateLimitMs: 1000,
  cartUrl: CART_URL,

  async login(credentials: StoreCredentials) {
    const verifier = randomPkceString(128);
    const state = randomPkceString(32);
    const challenge = pkceCodeChallenge(verifier);

    // These mirror the two plain cookies the real frontend's JS sets itself
    // before navigating to the authorize endpoint.
    let cookies = [
      `login_code_verifier_${state}=${verifier}`,
      `login_initial_location=%2F`,
    ];

    const authorizeUrl =
      `${AUTHORIZE_URL}?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        state,
        response_type: "code",
        scope: "",
        code_challenge: challenge,
        code_challenge_method: "S256",
        theme: "light",
        lang: "da",
      }).toString();

    cookies = await followRedirectChain(authorizeUrl, cookies);

    const loginResponse = await safeFetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json",
        origin: "https://login.rema1000.dk",
        referer: "https://login.rema1000.dk/",
        "x-device": "web",
        "x-language": "da",
        "x-timezone": "Copenhagen/Europe",
        cookie: cookieHeader(cookies),
      },
      body: JSON.stringify({
        email: credentials.username,
        password: credentials.password,
      }),
    });
    cookies = mergeSetCookies(cookies, loginResponse);

    if (!loginResponse.ok) {
      throw createError({
        status: 502,
        message: `Rema 1000 login failed (${loginResponse.status})`,
      });
    }

    const loginData = (await loginResponse.json()) as {
      redirect_uri: string | null;
    };
    if (!loginData.redirect_uri) {
      throw createError({
        status: 401,
        message: "Invalid Rema 1000 credentials",
      });
    }

    cookies = await followRedirectChain(loginData.redirect_uri, cookies);

    const accessToken = findCookieValue(cookies, "access_token");
    if (!accessToken) {
      throw createError({
        status: 502,
        message: "Rema 1000 login did not return an access token",
      });
    }

    const userId = decodeJwtSubject(accessToken);
    if (!userId) {
      throw createError({
        status: 502,
        message: "Rema 1000 access token has no user id",
      });
    }
    const listId = await fetchPrimaryListId(accessToken, userId);
    const items = await fetchItemMap(accessToken, listId);

    const session: RemaSession = {
      cookies,
      createdAt: Date.now(),
      listId,
      items,
    };
    return session;
  },

  async addToBasket(
    session: StoreSession,
    productId: string,
    quantity: number,
  ) {
    const s = session as RemaSession;
    const existing = s.items[productId];
    const targetAmount = (existing?.amount ?? 0) + quantity;

    if (existing) {
      await remaRequest(
        s,
        `/api/v2/shoppinglists/${s.listId}/items/${existing.itemId}`,
        { method: "PATCH", body: { amount: targetAmount } },
      );
      existing.amount = targetAmount;
    } else {
      const created = await remaRequest<{ id: number; amount: number }>(
        s,
        `/api/v2/shoppinglists/${s.listId}/items`,
        {
          method: "POST",
          body: {
            amount: targetAmount,
            store_id: STORE_ID,
            store_item_id: Number(productId),
            source: "shop_search",
          },
        },
      );
      s.items[productId] = { itemId: created.id, amount: created.amount };
    }
  },

  async removeFromBasket(
    session: StoreSession,
    productId: string,
    quantity: number,
  ) {
    const s = session as RemaSession;
    const existing = s.items[productId];
    if (!existing) return;

    const targetAmount = existing.amount - quantity;
    if (targetAmount <= 0) {
      await remaRequest(s, `/api/v2/shoppinglists/${s.listId}`, {
        method: "PATCH",
        body: { items: [{ id: existing.itemId, delete: true }] },
      });
      // Reflect.deleteProperty avoids `delete obj[computedKey]`, which this
      // project's lint config disallows (no-dynamic-delete).
      Reflect.deleteProperty(s.items, productId);
    } else {
      await remaRequest(
        s,
        `/api/v2/shoppinglists/${s.listId}/items/${existing.itemId}`,
        { method: "PATCH", body: { amount: targetAmount } },
      );
      existing.amount = targetAmount;
    }
  },
};

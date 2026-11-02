import { safeFetch } from "#server/utils/safeFetch";
import type { StoreSession } from "#server/utils/onlineStore/types";

/**
 * Helpers for cookie-session-based online store adapters: maintaining a
 * flat array of raw `Set-Cookie` strings as a session's cookie jar, and
 * performing requests built on top of it (JSON POSTs, and manually following
 * a multi-hop redirect chain while accumulating cookies along the way).
 * Most grocery store web APIs follow this pattern: log in to get a cookie,
 * then replay it on subsequent requests.
 */

/** Build a `Cookie` header value from stored Set-Cookie strings. */
export function cookieHeader(cookies: string[]): string {
  return cookies
    .map((c) => c.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

/**
 * Merge a response's `Set-Cookie` headers into an existing cookie jar,
 * replacing any cookie of the same name (last write wins). Needed for
 * multi-hop flows (e.g. an OAuth redirect chain) where a cookie such as a
 * session id is reissued with a new value at every hop.
 */
export function mergeSetCookies(existing: string[], response: Response): string[] {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) return existing;

  const byName = new Map<string, string>();
  for (const raw of [...existing, ...setCookies]) {
    const name = raw.split("=", 1)[0];
    if (name) byName.set(name, raw);
  }
  return [...byName.values()];
}

/** Find a specific cookie's decoded value in a stored Set-Cookie jar. */
export function findCookieValue(
  cookies: string[],
  name: string,
): string | undefined {
  for (const raw of cookies) {
    const nameValue = raw.split(";", 1)[0] ?? "";
    const eq = nameValue.indexOf("=");
    if (eq === -1) continue;
    if (nameValue.slice(0, eq) === name) {
      return decodeURIComponent(nameValue.slice(eq + 1));
    }
  }
  return undefined;
}

/**
 * Set a cookie's value in a jar directly, replacing any existing entry of
 * the same name. Unlike {@link mergeSetCookies}, this doesn't come from a
 * `Set-Cookie` response header — use it when a store hands back a fresh
 * token in a JSON body instead of (or in addition to) reissuing the cookie,
 * so the jar doesn't go stale relative to what was actually used.
 */
export function upsertCookie(
  cookies: string[],
  name: string,
  value: string,
): string[] {
  const encoded = `${name}=${encodeURIComponent(value)}`;
  const withoutExisting = cookies.filter(
    (raw) => raw.split("=", 1)[0] !== name,
  );
  return [...withoutExisting, encoded];
}

export interface JsonPostOptions {
  /**
   * Extract a human-readable error message from the (already-parsed) response
   * body when the HTTP status is not OK. Return `undefined` to fall back to the
   * generic "Store request failed (status)" message.
   */
  extractError?: (body: unknown) => string | undefined;
}

/**
 * Perform a JSON POST request, optionally attaching a cookie session.
 *
 * Throws a 502 `createError` on non-OK responses. Use `extractError` in
 * options to parse store-specific error payloads.
 */
export async function jsonPost(
  url: string,
  body: unknown,
  session?: StoreSession,
  options?: JsonPostOptions,
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (session) headers.cookie = cookieHeader(session.cookies);

  const response = await safeFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Store request failed (${response.status})`;
    try {
      const data: unknown = await response.json();
      const extracted = options?.extractError?.(data);
      if (extracted) message = extracted;
    } catch {
      // ignore non-JSON error bodies
    }
    throw createError({ status: 502, message });
  }
  return response;
}

/**
 * Manually follow a redirect chain (rather than relying on `fetch`'s
 * automatic redirect handling), merging the `Set-Cookie` headers of every
 * hop into a cookie jar as we go. Needed for multi-hop login/OAuth flows
 * where a cookie (e.g. a session id) is reissued with a new value at every
 * hop, and the caller needs the final accumulated jar, not just the last
 * response.
 *
 * Throws a 502 `createError` if the chain exceeds `maxHops` without landing
 * on a non-redirect response.
 */
export async function followRedirectChain(
  url: string,
  cookies: string[],
  maxHops = 10,
): Promise<string[]> {
  let currentUrl = url;
  let currentCookies = cookies;

  for (let i = 0; i < maxHops; i++) {
    const response = await safeFetch(currentUrl, {
      redirect: "manual",
      follow: false,
      headers: { cookie: cookieHeader(currentCookies) },
    });
    currentCookies = mergeSetCookies(currentCookies, response);

    const location = response.headers.get("location");
    if (!location || response.status < 300 || response.status >= 400) {
      return currentCookies;
    }
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw createError({
    status: 502,
    message: "Too many redirects while following a store's redirect chain",
  });
}

import { safeFetch } from "#server/utils/safeFetch";
import type { StoreSession } from "#server/utils/onlineStore/types";

/**
 * Shared utilities for building cookie-session-based online store adapters.
 * Most grocery store web APIs follow the same pattern: log in to get a cookie,
 * then replay it on subsequent JSON POST requests.
 */

/** Build a `Cookie` header value from stored Set-Cookie strings. */
export function cookieHeader(session: StoreSession): string {
  return session.cookies
    .map((c) => c.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
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
  if (session) headers.cookie = cookieHeader(session);

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

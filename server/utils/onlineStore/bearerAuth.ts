import { safeFetch } from "#server/utils/safeFetch";

/**
 * Helper for bearer-token-authenticated online store adapters: a single JSON
 * request authenticated with a bearer token (sent as an Authorization
 * header). Unlike cookie-session stores, this needs no persistent jar —
 * each call is self-contained given just the token string.
 */

export interface BearerRequestOptions {
  method?: string;
  body?: unknown;
  /** Extra headers to send alongside the bearer token (e.g. a locale or device header some APIs require). Cannot override the Authorization header itself. */
  headers?: Record<string, string>;
  /**
   * Extract a human-readable error message from the (already-parsed) response
   * body when the HTTP status is not OK. Return `undefined` to fall back to the
   * generic "Store request failed (status)" message.
   */
  extractError?: (body: unknown) => string | undefined;
}

/**
 * Perform a JSON request authenticated via an Authorization header
 * carrying a bearer token, for stores whose API expects that instead of
 * cookies. Supports arbitrary HTTP methods.
 *
 * Throws a `createError` with the upstream status code on non-OK responses
 * (so callers can detect e.g. a 401 and retry after refreshing the token).
 * Returns the parsed JSON response body.
 */
export async function bearerRequest<T = unknown>(
  url: string,
  token: string,
  options?: BearerRequestOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...options?.headers,
    authorization: "Bearer " + token,
  };
  let body: string | undefined;
  if (options?.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await safeFetch(url, {
    method: options?.method ?? "GET",
    headers,
    body,
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
    throw createError({ status: response.status, message });
  }
  return response.json() as Promise<T>;
}

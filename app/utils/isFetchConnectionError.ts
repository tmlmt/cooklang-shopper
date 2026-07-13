import type { FetchError } from "ofetch";

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ERR_CONNECTION_REFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "ETIMEDOUT",
]);

type ErrorWithCode = { code?: string };

/**
 * Detect network/connection failures from ofetch errors.
 * This intentionally excludes HTTP validation errors that have a response.
 */
export function isFetchConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const fetchError = error as FetchError<unknown>;
  const isFetchLike =
    "response" in fetchError ||
    "request" in fetchError ||
    "data" in fetchError ||
    "status" in fetchError ||
    "statusCode" in fetchError;

  if (!isFetchLike) return false;

  const code =
    (fetchError.cause as ErrorWithCode | undefined)?.code?.toUpperCase() ?? "";
  const message = (fetchError.message ?? "").toUpperCase();

  return (
    !fetchError.response ||
    CONNECTION_ERROR_CODES.has(code) ||
    message.includes("ERR_CONNECTION_REFUSED") ||
    message.includes("FAILED TO FETCH")
  );
}

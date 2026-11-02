/**
 * Minimal JWT payload decoding, with no signature verification. Only safe to
 * use on a token the caller already trusts (e.g. one it just obtained itself
 * from the issuing store), never to authenticate untrusted input.
 * Independent of how the token was obtained (OAuth, plain login, etc).
 */

/** Decode a JWT's payload (the middle, base64url-encoded segment) as JSON. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payloadPart = token.split(".")[1];
  if (!payloadPart) {
    throw createError({ status: 502, message: "Malformed JWT: missing payload segment" });
  }
  const padded = payloadPart + "=".repeat((4 - (payloadPart.length % 4)) % 4);
  return JSON.parse(
    Buffer.from(padded, "base64url").toString("utf-8"),
  ) as Record<string, unknown>;
}

/** The JWT's `sub` claim (RFC 7519 "subject", commonly a user id), or `undefined` if absent. */
export function decodeJwtSubject(token: string): string | undefined {
  const sub = decodeJwtPayload(token).sub;
  return typeof sub === "string" ? sub : undefined;
}

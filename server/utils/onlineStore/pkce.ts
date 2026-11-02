import { createHash, randomBytes } from "node:crypto";

/**
 * PKCE (Proof Key for Code Exchange, RFC 7636) helpers for adapters that need
 * to drive an OAuth2 authorization-code flow themselves, without an
 * end-user's browser in the loop. Independent of whatever token format the
 * store returns at the end of the flow.
 */

/** Unreserved URL characters (RFC 3986), the alphabet PKCE verifiers/state values commonly use. */
const PKCE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/** Generate a random string suitable for a PKCE `code_verifier` or an OAuth `state` value. */
export function randomPkceString(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    out += PKCE_ALPHABET[byte % PKCE_ALPHABET.length] ?? "";
  }
  return out;
}

/** Compute the S256 PKCE `code_challenge` for a given `code_verifier` (RFC 7636). */
export function pkceCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest().toString("base64url");
}

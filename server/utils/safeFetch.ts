import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

/**
 * SSRF protection for outbound requests to user-supplied URLs.
 *
 * Resolves the target host and rejects any address that is not globally
 * routable unicast — this covers private, loopback, link-local (e.g. cloud
 * metadata at 169.254.169.254), CGNAT, multicast and reserved ranges for both
 * IPv4 and IPv6. Only standard http/https ports are permitted, and every
 * redirect hop is re-validated.
 */

/** Whether a resolved IP address is safe to connect to (globally routable). */
export function isPublicAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;

  let addr = ipaddr.parse(ip);

  // Unwrap IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) and classify the IPv4.
  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address();
    }
  }

  return addr.range() === "unicast";
}

/**
 * Validate that a URL is safe to fetch: http/https only, a standard port, and
 * a hostname that resolves exclusively to public addresses. Throws otherwise.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw createError({ status: 400, message: "Invalid URL" });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw createError({
      status: 400,
      message: "Only http/https URLs are supported",
    });
  }

  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    throw createError({
      status: 400,
      message: "Only standard http/https ports are allowed",
    });
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw createError({ status: 400, message: "Could not resolve host" });
  }

  if (
    addresses.length === 0 ||
    !addresses.every((a) => isPublicAddress(a.address))
  ) {
    throw createError({
      status: 400,
      message: "Requests to this address are not allowed",
    });
  }

  return parsed;
}

/**
 * SSRF-safe replacement for `fetch` for user-supplied URLs. Validates the URL
 * (and every redirect target) with {@link assertPublicUrl} before connecting.
 */
export async function safeFetch(
  url: string,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = 5, ...rest } = init;
  let currentUrl = url;

  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(currentUrl);
    const response = await fetch(currentUrl, { ...rest, redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return response;
  }

  throw createError({ status: 422, message: "Too many redirects" });
}

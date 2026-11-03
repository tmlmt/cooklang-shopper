import { lookup } from "node:dns/promises";
import { lookup as lookupCb, type LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * SSRF protection for outbound requests to user-supplied URLs.
 *
 * Resolves the target host and rejects any address that is not globally
 * routable unicast — this covers private, loopback, link-local (e.g. cloud
 * metadata at 169.254.169.254), CGNAT, multicast and reserved ranges for both
 * IPv4 and IPv6. Only standard http/https ports are permitted, and every
 * redirect hop is re-validated. The addresses the socket connects to are the
 * very ones validated (see {@link validatedLookup}), so a hostname that
 * resolves differently on a second lookup (DNS rebinding) cannot bypass it.
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
 * Socket-level DNS lookup that only yields public addresses. Used as the
 * connector's `lookup`, so validation and connection share a single
 * resolution: there is no second lookup an attacker could answer differently.
 */
export const validatedLookup: LookupFunction = (hostname, options, callback) => {
  lookupCb(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);

    const list = addresses as LookupAddress[];
    if (list.length === 0 || !list.every((a) => isPublicAddress(a.address))) {
      return callback(
        new Error("Requests to this address are not allowed"),
        "",
        4,
      );
    }

    if (options.all) {
      // Node typings for LookupFunction omit the `all: true` array form.
      return (
        callback as unknown as (
          err: null,
          addresses: LookupAddress[],
        ) => void
      )(null, list);
    }
    callback(null, list[0]!.address, list[0]!.family);
  });
};

const safeAgent = new Agent({ connect: { lookup: validatedLookup } });

/**
 * SSRF-safe replacement for `fetch` for user-supplied URLs. Validates the URL
 * (and every redirect target) with {@link assertPublicUrl} before connecting,
 * and connects only to addresses validated by {@link validatedLookup}.
 *
 * Pass `follow: false` to get a single hop's raw response back as-is (status,
 * headers including `Set-Cookie`, `Location`) instead of auto-following
 * redirects — needed by adapters that must inspect/replay cookies across a
 * multi-hop redirect chain (e.g. an OAuth login dance).
 */
export async function safeFetch(
  url: string,
  init: RequestInit & { maxRedirects?: number; follow?: boolean } = {},
): Promise<Response> {
  const { maxRedirects = 5, follow = true, ...rest } = init;
  let currentUrl = url;

  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(currentUrl);
    const response = (await undiciFetch(currentUrl, {
      ...(rest as Parameters<typeof undiciFetch>[1]),
      redirect: "manual",
      dispatcher: safeAgent,
    })) as unknown as Response;

    if (follow && response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return response;
  }

  throw createError({ status: 422, message: "Too many redirects" });
}

import { describe, it, expect, vi } from "vitest";
import { isPublicAddress, assertPublicUrl } from "~~/server/utils/safeFetch";

vi.stubGlobal(
  "createError",
  (opts: { status: number; message: string }) => new Error(opts.message),
);

describe("isPublicAddress", () => {
  it("accepts public IPv4 addresses", () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(isPublicAddress("93.184.216.34")).toBe(true);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });

  it("rejects loopback IPv4", () => {
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("127.255.255.255")).toBe(false);
  });

  it("rejects RFC 1918 private IPv4", () => {
    expect(isPublicAddress("10.0.0.5")).toBe(false);
    expect(isPublicAddress("172.16.0.1")).toBe(false);
    expect(isPublicAddress("172.31.255.255")).toBe(false);
    expect(isPublicAddress("192.168.1.1")).toBe(false);
  });

  it("rejects link-local / cloud metadata IPv4", () => {
    expect(isPublicAddress("169.254.169.254")).toBe(false);
    expect(isPublicAddress("169.254.0.1")).toBe(false);
  });

  it("rejects CGNAT, reserved and multicast IPv4", () => {
    expect(isPublicAddress("100.64.0.1")).toBe(false);
    expect(isPublicAddress("0.0.0.0")).toBe(false);
    expect(isPublicAddress("224.0.0.1")).toBe(false);
    expect(isPublicAddress("240.0.0.1")).toBe(false);
  });

  it("keeps 172.x outside the private block public", () => {
    expect(isPublicAddress("172.15.0.1")).toBe(true);
    expect(isPublicAddress("172.32.0.1")).toBe(true);
  });

  it("rejects IPv6 loopback and unspecified", () => {
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("::")).toBe(false);
  });

  it("rejects IPv6 ULA, link-local and multicast", () => {
    expect(isPublicAddress("fc00::1")).toBe(false);
    expect(isPublicAddress("fd12:3456::1")).toBe(false);
    expect(isPublicAddress("fe80::1")).toBe(false);
    expect(isPublicAddress("ff02::1")).toBe(false);
  });

  it("rejects IPv4-mapped IPv6 pointing at private space", () => {
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("::ffff:169.254.169.254")).toBe(false);
  });

  it("accepts public IPv6", () => {
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });

  it("rejects non-IP input", () => {
    expect(isPublicAddress("not-an-ip")).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(assertPublicUrl("ftp://example.com")).rejects.toThrow();
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
  });

  it("rejects invalid URLs", async () => {
    await expect(assertPublicUrl("not a url")).rejects.toThrow();
  });

  it("rejects non-standard ports", async () => {
    await expect(assertPublicUrl("http://example.com:8080")).rejects.toThrow();
    await expect(assertPublicUrl("http://1.1.1.1:22")).rejects.toThrow();
  });

  it("rejects literal private/metadata IP hosts", async () => {
    await expect(assertPublicUrl("http://127.0.0.1")).rejects.toThrow();
    await expect(assertPublicUrl("http://169.254.169.254")).rejects.toThrow();
    await expect(assertPublicUrl("http://[::1]")).rejects.toThrow();
    await expect(assertPublicUrl("http://192.168.0.1")).rejects.toThrow();
  });

  it("accepts a literal public IP host", async () => {
    await expect(assertPublicUrl("https://1.1.1.1")).resolves.toBeInstanceOf(
      URL,
    );
  });
});

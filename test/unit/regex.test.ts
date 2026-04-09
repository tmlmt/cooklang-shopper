import { urlRegex } from "~~/shared/regex";
import { describe, expect, it } from "vitest";

describe("urlRegex", () => {
  it.each([
    "http://example.com",
    "https://example.com",
    "http://www.example.com",
    "https://www.example.com",
    "http://example.com/path",
    "https://example.com/path?query=string#fragment",
    "http://subdomain.example.com",
    "https://subdomain.example.com:8080",
  ])("should match %s as valid URL", (url) => {
    expect(urlRegex.test(url)).toBe(true);
  });

  it.each([
    "http:/example.com",
    "https//example.com",
    "http://example",
    "http://.com",
    "http://example..com",
  ])("should not match %s, invalid URL", (url) => {
    expect(urlRegex.test(url)).toBe(false);
  });
});

import { describe, it, expect, vi } from "vitest";
import { validateRecipePath } from "~~/shared/utils/path";

vi.stubGlobal(
  "createError",
  (opts: { statusCode: number; statusMessage: string }) =>
    new Error(opts.statusMessage),
);

describe("validateRecipePath", () => {
  it("accepts a simple recipe name", () => {
    expect(() => validateRecipePath("my-recipe")).not.toThrow();
  });

  it("accepts a path with subdirectory", () => {
    expect(() => validateRecipePath("mains/my-recipe")).not.toThrow();
  });

  it("accepts a deeply nested path", () => {
    expect(() => validateRecipePath("a/b/c/recipe")).not.toThrow();
  });

  it("accepts unicode characters", () => {
    expect(() => validateRecipePath("desserts/Pancakes géants")).not.toThrow();
  });

  it("accepts paths with spaces and dots", () => {
    expect(() => validateRecipePath("my recipes/foo.bar")).not.toThrow();
  });

  it("rejects path starting with /", () => {
    expect(() => validateRecipePath("/etc/passwd")).toThrow();
  });

  it("rejects path with backslashes", () => {
    expect(() => validateRecipePath("foo\\bar")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateRecipePath("")).toThrow();
  });

  it("rejects path with null bytes", () => {
    expect(() => validateRecipePath("foo\0bar")).toThrow();
  });
});

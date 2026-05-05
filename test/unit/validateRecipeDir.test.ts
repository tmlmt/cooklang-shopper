import { describe, it, expect, vi } from "vitest";
import { validateRecipeDir } from "~~/server/utils/validateRecipePath";

vi.stubGlobal(
  "createError",
  (opts: { status: number; statusText: string }) => new Error(opts.statusText),
);

describe("validateRecipeDir", () => {
  it("accepts empty string (root directory)", () => {
    expect(() => validateRecipeDir("")).not.toThrow();
  });

  it("accepts a simple directory name", () => {
    expect(() => validateRecipeDir("mains")).not.toThrow();
  });

  it("accepts a nested directory path", () => {
    expect(() => validateRecipeDir("mains/italian")).not.toThrow();
  });

  it("accepts unicode directory name", () => {
    expect(() => validateRecipeDir("desserts and sweets")).not.toThrow();
  });

  it("accepts & ( ) characters", () => {
    expect(() => validateRecipeDir("Sauces & Spreads (spicy)")).not.toThrow();
  });

  it("accepts single quotes", () => {
    expect(() => validateRecipeDir("l'apéro")).not.toThrow();
  });

  it("rejects commas", () => {
    expect(() => validateRecipeDir("Salt, Pepper")).toThrow();
  });

  it("rejects .. traversal", () => {
    expect(() => validateRecipeDir("..")).toThrow();
  });

  it("rejects nested .. traversal", () => {
    expect(() => validateRecipeDir("mains/../../etc")).toThrow();
  });

  it("rejects path starting with /", () => {
    expect(() => validateRecipeDir("/etc")).toThrow();
  });

  it("rejects backslashes", () => {
    expect(() => validateRecipeDir("foo\\bar")).toThrow();
  });
});

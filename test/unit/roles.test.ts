import { describe, expect, it } from "vitest";
import { isRole } from "~~/shared/utils/roles";

describe("isRole", () => {
  it("recognizes only supported database roles", () => {
    expect(isRole("viewer")).toBe(true);
    expect(isRole("admin")).toBe(true);
    expect(isRole("owner")).toBe(false);
  });
});

import { Pantry, ProductCatalog, Recipe } from "@tmlmt/cooklang-parser";
import { describe, expect, it, vi } from "vitest";
import {
  countDiagnostics,
  createDiagnosticParser,
} from "../../app/utils/diagnostics";

describe("createDiagnosticParser", () => {
  it("returns the parsed result for valid sources", () => {
    const parse = createDiagnosticParser((s) => new Recipe(s));
    const { result, diagnostics } = parse("Add @salt{1%tsp}");
    expect(result).toBeInstanceOf(Recipe);
    expect(diagnostics).toBe(result!.diagnostics);
  });

  it("collects diagnostics from invalid pantry and catalog sources", () => {
    const invalid = "[fridge\nmilk = ";
    for (const parse of [
      createDiagnosticParser((s) => new Pantry(s)),
      createDiagnosticParser((s) => new ProductCatalog(s)),
    ]) {
      const { result, diagnostics } = parse(invalid);
      expect(result).toBeUndefined();
      expect(countDiagnostics(diagnostics).errorCount).toBeGreaterThan(0);
    }
  });

  it("memoises the last parse", () => {
    const factory = vi.fn((s: string) => new Pantry(s));
    const parse = createDiagnosticParser(factory);
    parse('[a]\nb = { quantity = "1%kg" }');
    parse('[a]\nb = { quantity = "1%kg" }');
    expect(factory).toHaveBeenCalledTimes(1);
    parse("");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("rethrows errors that are not diagnostics", () => {
    const parse = createDiagnosticParser(() => {
      throw new Error("boom");
    });
    expect(() => parse("x")).toThrow("boom");
  });
});

describe("countDiagnostics", () => {
  it("counts by severity", () => {
    const counts = countDiagnostics([
      { severity: "error" },
      { severity: "warning" },
      { severity: "warning" },
    ] as never);
    expect(counts).toEqual({ errorCount: 1, warningCount: 2 });
  });
});

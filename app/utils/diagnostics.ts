import { DiagnosticError, type Diagnostic } from "@tmlmt/cooklang-parser";

export interface ParseResult<T> {
  result?: T;
  diagnostics: Diagnostic[];
}

// Memorises the last parse so several consumers of the same source share one parse
// Pantry and Catalog has only one consumer, but Recipe has several consumers (validator, parser)
export function createDiagnosticParser<T extends { diagnostics: Diagnostic[] }>(
  factory: (source: string) => T,
): (source: string) => ParseResult<T> {
  let last: { source: string; parsed: ParseResult<T> } | undefined;

  return (source) => {
    if (last?.source === source) return last.parsed;
    let parsed: ParseResult<T>;
    try {
      const result = factory(source);
      parsed = { result, diagnostics: result.diagnostics };
    } catch (error) {
      if (!(error instanceof DiagnosticError)) throw error;
      parsed = { diagnostics: error.diagnostics };
    }
    last = { source, parsed };
    return parsed;
  };
}

export function countDiagnostics(diagnostics: Diagnostic[]) {
  return {
    errorCount: diagnostics.filter((d) => d.severity === "error").length,
    warningCount: diagnostics.filter((d) => d.severity === "warning").length,
  };
}

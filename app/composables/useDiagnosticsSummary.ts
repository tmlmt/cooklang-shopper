import type { Diagnostic } from "@tmlmt/cooklang-parser";

export function useDiagnosticsSummary(diagnostics: Ref<Diagnostic[]>) {
  const { $ts, $tc } = useI18n();

  const counts = computed(() => countDiagnostics(diagnostics.value));
  const errorCount = computed(() => counts.value.errorCount);
  const warningCount = computed(() => counts.value.warningCount);

  const summary = computed<{
    label: string;
    color: "error" | "warning" | "success";
  }>(() => {
    if (errorCount.value > 0) {
      return {
        label: `✕ ${$tc("diagnostics.errors", { count: errorCount.value })}`,
        color: "error",
      };
    }
    if (warningCount.value > 0) {
      return {
        label: `⚠ ${$tc("diagnostics.warnings", { count: warningCount.value })}`,
        color: "warning",
      };
    }
    return { label: `✓ ${$ts("diagnostics.noIssue")}`, color: "success" };
  });

  return { errorCount, warningCount, summary };
}

/**
 * Quota diagnostics (Phase 8): developer-facing, console-only, zero paid
 * analytics (spec §32). Snapshot writes report sizes and chunk counts;
 * project sync reports push scheduling so write patterns can be audited
 * against Firestore's free quota during a real class.
 */

type DiagnosticDetails = Record<string, string | number | boolean>

export function reportQuotaDiagnostic(label: string, details: DiagnosticDetails): void {
  if (typeof console === 'undefined') return
  // console.debug is hidden by default in most browsers — deliberate:
  // diagnostics for developers, invisible to students.
  console.debug(`[quota] ${label}`, details)
}

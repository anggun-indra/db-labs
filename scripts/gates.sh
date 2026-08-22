#!/usr/bin/env bash
# Full release gate for Database Learning Lab (Phase 8 release checklist).
# Stops on the first failing gate and reports which one.
#
# Usage: npm run gates            # everything
#        npm run gates -- --quick # skip e2e (fast local loop)
set -uo pipefail
cd "$(dirname "$0")/.."

QUICK=0
[[ "${1:-}" == "--quick" ]] && QUICK=1

gate() {
  local label="$1"; shift
  echo "=== GATE: $label"
  if "$@"; then
    echo "=== PASS: $label"
  else
    echo "=== FAIL: $label" >&2
    exit 1
  fi
}

gate "lint (0 warnings)" npx eslint .
gate "typecheck" npx tsc -b --noEmit
gate "unit + integration tests" ./node_modules/.bin/vitest run
gate "production build" npm run build
if [[ "$QUICK" -eq 0 ]]; then
  gate "e2e critical flows" npx playwright test
fi

echo ""
echo "ALL GATES PASSED"
if [[ "$QUICK" -eq 1 ]]; then
  echo "(quick mode: e2e skipped — run 'npm run gates' before releasing)"
fi

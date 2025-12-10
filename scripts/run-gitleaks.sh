#!/usr/bin/env bash
set -euo pipefail

# Run gitleaks locally to scan repository (working tree + history)
# Requirements:
#  - gitleaks installed (https://github.com/gitleaks/gitleaks)
#  - git available

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Full history scan
GITLEAKS_CMD=(gitleaks detect --source . --report-format sarif --report-path gitleaks.sarif)

echo "Running: ${GITLEAKS_CMD[*]}"
"${GITLEAKS_CMD[@]}"

echo "Report written to gitleaks.sarif"

# Also emit a quick CSV for grepping
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source . --report-format csv --report-path gitleaks.csv || true
  echo "CSV report written to gitleaks.csv (may be empty if no findings)."
fi

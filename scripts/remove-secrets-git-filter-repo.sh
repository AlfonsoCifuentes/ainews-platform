#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
WARNING: History rewrites are destructive and require force-pushing.
Coordinate with all collaborators; after rewrite, everyone must reclone.

Steps (example):
1) Install git-filter-repo (https://github.com/newren/git-filter-repo)
   pip install git-filter-repo  OR brew install git-filter-repo
2) Clone fresh: git clone --mirror <repo-url>
   cd <repo>.git
3) Remove secrets by pattern (example: OPENAI_API_KEY):
   git filter-repo --replace-text <(printf 'OPENAI_API_KEY=***REMOVED***')
4) Verify: git log --stat | head
5) Force-push rewritten history:
   git push --force --all
   git push --force --tags
6) Tell all collaborators to reclone. Do NOT pull old history.

If any key was exposed, rotate it immediately at the provider dashboard.
EOF

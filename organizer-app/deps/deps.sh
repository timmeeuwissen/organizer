#!/usr/bin/env bash
# Lists OS-level dependencies in order (see deps/0*.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COLOR_BLUE='\033[34m'
COLOR_RESET='\033[0m'
for f in "$ROOT"/deps/0*.md; do
  [[ -f "$f" ]] || continue
  echo -e "${COLOR_BLUE}━━ $(basename "$f") ━━${COLOR_RESET}"
  cat "$f"
  echo ""
done

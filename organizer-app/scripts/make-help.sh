#!/usr/bin/env bash
# Two-column help from Makefile ## comments (cli-and-makefile.mdc).
set -euo pipefail
COLOR_CYAN="${COLOR_CYAN:-}"
COLOR_RESET="${COLOR_RESET:-}"
for mk in "$@"; do
  [[ -f "$mk" ]] || continue
  grep -E '^[a-zA-Z0-9_.-]+:.*?## .+' "$mk" | sort | while IFS= read -r line; do
    target="${line%%:*}"
    desc="${line#*## }"
    printf "  ${COLOR_CYAN}%-28s${COLOR_RESET} %s\n" "$target" "$desc"
  done
done

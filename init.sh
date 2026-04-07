#!/usr/bin/env bash
# init.sh — Start a local dev server for FlashCard Lab (no build step needed)
#
# Usage:
#   bash init.sh
#
# Tries (in order):
#   1. python3 http.server
#   2. npx serve
#   3. Falls back to opening index.html directly (file:// mode)

set -e

PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "⚡  FlashCard Lab"
echo "──────────────────────────────"

cd "$DIR"

if command -v python3 &>/dev/null; then
  echo "Starting Python HTTP server on http://localhost:$PORT"
  echo "Press Ctrl+C to stop."
  echo ""
  python3 -m http.server "$PORT"
elif command -v npx &>/dev/null; then
  echo "Starting npx serve on http://localhost:$PORT"
  echo "Press Ctrl+C to stop."
  echo ""
  npx serve -l "$PORT" .
else
  echo "No server found. Opening index.html directly (file:// mode)."
  echo "Note: some browsers may restrict LocalStorage on file:// URLs."
  echo ""
  open "$DIR/index.html" 2>/dev/null \
    || xdg-open "$DIR/index.html" 2>/dev/null \
    || start "$DIR/index.html" 2>/dev/null \
    || echo "Could not auto-open browser. Please open index.html manually."
fi

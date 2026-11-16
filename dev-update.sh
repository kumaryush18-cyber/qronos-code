#!/usr/bin/env bash
# Rebuild the Qronos Code extension bundles and copy them into the installed
# extension folder, so a plain "Developer: Reload Window" picks up the change.
# No .vsix, no reinstall.
#
# Usage:
#   ./dev-update.sh            # rebuild everything (slow, needs ~2 GB free)
#   ./dev-update.sh webview    # rebuild one bundle (fast, needs ~700 MB)
#
# The installed CLI (bin/qronos) is a small wrapper that runs the live TypeScript
# in packages/cli, so backend changes need no rebuild at all - just reload.

set -euo pipefail

SRC="/workspaces/qronos-code/packages/extension"
DEST="${QRONOS_INSTALLED_EXT:-/home/codespace/.vscode-remote/extensions/qronos-ai.qronos-code-1.0.0}"

if [ ! -d "$DEST" ]; then
  echo "Installed extension not found: $DEST" >&2
  echo "Set QRONOS_INSTALLED_EXT to the folder under ~/.vscode-remote/extensions" >&2
  exit 1
fi

cd "$SRC"

if [ "$#" -ge 1 ]; then
  ENTRIES=("$@")
else
  ENTRIES=(extension webview settings agent-manager marketplace diff-viewer documents browser-tab diff-virtual shiki-worker markdown-shiki-worker)
fi

for entry in "${ENTRIES[@]}"; do
  echo "=== building $entry ==="
  # One entry per process: the all-in-one build gets OOM-killed next to a live
  # Extension Host on this 8 GB box.
  ENTRY="$entry" bun esbuild.js
done

mkdir -p "$DEST/dist" "$DEST/assets/icons"
cp -r dist/. "$DEST/dist/"
cp package.json "$DEST/package.json"
if [ -d assets/icons ]; then cp -r assets/icons/. "$DEST/assets/icons/"; fi

echo
echo "Synced to $DEST"
echo "Now run: Developer: Reload Window  (Ctrl+Shift+P)"

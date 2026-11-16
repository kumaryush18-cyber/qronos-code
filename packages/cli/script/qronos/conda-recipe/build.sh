#!/bin/bash
# Repackages a pre-built Qronos CLI release archive (see packages/cli/script/build.ts)
# into a conda environment. No compilation happens here -- the archive already
# contains a finished, platform-specific `qronos` binary plus its runtime assets
# (tree-sitter grammars, sandbox helpers, and on Linux, bwrap + licenses).
#
# `interpreter: bash` is forced in recipe.yaml, so this script always runs
# through bash on the build machine even when cross-building for a different
# target platform (e.g. building the win-64 package from a Linux CI runner).
set -euo pipefail

mkdir -p "$PREFIX/lib/qronos"
cp -a "$SRC_DIR"/. "$PREFIX/lib/qronos/"

if [ -f "$PREFIX/lib/qronos/qronos.exe" ]; then
  chmod +x "$PREFIX/lib/qronos/qronos.exe"
  mkdir -p "$PREFIX/Scripts"
  cat > "$PREFIX/Scripts/qronos.bat" <<'BATCH'
@echo off
setlocal
set "QRONOS_TREE_SITTER_WASM_DIR=%~dp0..\lib\qronos\tree-sitter"
"%~dp0..\lib\qronos\qronos.exe" %*
BATCH
else
  chmod +x "$PREFIX/lib/qronos/qronos"
  if [ -f "$PREFIX/lib/qronos/bwrap" ]; then
    chmod +x "$PREFIX/lib/qronos/bwrap"
  fi
  mkdir -p "$PREFIX/bin"
  cat > "$PREFIX/bin/qronos" <<'SHELL'
#!/usr/bin/env bash
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export QRONOS_TREE_SITTER_WASM_DIR="$here/../lib/qronos/tree-sitter"
exec "$here/../lib/qronos/qronos" "$@"
SHELL
  chmod +x "$PREFIX/bin/qronos"
fi

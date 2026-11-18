# Qronos Code

**An autonomous AI coding agent for VS Code, running on the Qronos AI gateway.**

Qronos Code reads your project, edits files, runs commands and tests the result. It signs in with GitHub, works
inside a sandbox, and asks before it does anything risky.

[Website](https://qronos.me) · [Dashboard](https://qronos.me/dashboard) · [Privacy](https://qronos.me/privacy) ·
[Terms](https://qronos.me/terms) · [Issues](https://github.com/kumaryush18-cyber/qronos-code/issues)

---

## Install and start

1. Install **Qronos Code** from the Marketplace (or from a platform `.vsix` attached to a release).
2. Open the Qronos Code panel in the activity bar.
3. Click **Sign in with GitHub**. A code appears; enter it on the GitHub page that opens.
4. Pick a model in the selector and send your first message.

That is the whole setup. No configuration file is required.

## What you get

- **GitHub sign-in** — one device code, no API key to copy.
- **A real agent loop** — read, search, edit, run tests, and fix its own mistakes in the same session.
- **Approval first** — every command and file write asks you, unless you turn on auto-approve.
- **Sandboxed tools** — commands run in a confined process, not in your shell.
- **Bring your own provider** — any OpenAI-compatible endpoint you configure appears in the model picker next to the
  Qronos models.
- **Web search** — works without an API key.
- **Diff review** — every change is shown before it lands.

Model names and prices change often, so the picker reads the live list from your account instead of shipping a fixed
catalogue. If a model is unavailable, you see that instead of a stale name.

## Cost

Qronos AI accounts include a daily token allowance, topped up every day at 00:00 UTC. Your usage and remaining
allowance are visible in the panel. Paid models are billed to your account balance; free models cost nothing.

You can also point the extension at your own provider key and pay that provider directly.

## Privacy, short version

- Your code is sent only to the model provider you select, and only the parts the agent reads.
- Sign-in credentials are stored on your machine, not in the cloud.
- The full policy is at [qronos.me/privacy](https://qronos.me/privacy) and the terms at
  [qronos.me/terms](https://qronos.me/terms).

## Requirements

- VS Code 1.90 or newer.
- Linux x64, Windows x64, macOS Apple Silicon, or macOS Intel. Each platform ships its own package.
- An internet connection for the model gateway. Everything else runs locally.

## Troubleshooting

**No models in the picker.** You are probably signed out. Sign in again; the list is fetched from your account, so an
empty list means an empty session.

**Signing in again did not help.** Reload the window once (`Ctrl+Shift+P` → *Developer: Reload Window*). A local
backend keeps its own copy of credentials, and a reload is the fastest way to clear it.

**A tool fails with a permission error.** Open the approval dialog and allow the directory, or enable auto-approve for
that session only.

**Report a problem.** Open an issue with the version from *Extensions → Qronos Code*, your OS, and the text of the
error. Logs are at `~/.local/share/qronos/log/` (Linux/macOS) or `%LOCALAPPDATA%\qronos\log\` (Windows).

## Licence

MIT. Copyright (c) 2026 Qronos AI. This project is a fork of Kilo Code; the original MIT notices are kept in
`LICENSE.txt` and `NOTICE`.

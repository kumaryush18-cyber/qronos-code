# Baseline (phase 0)

Recorded before the rename started, so we can prove later that phase 1 changed no
behaviour.

| Item | Value |
|---|---|
| Source repo | `/workspaces/qronos-code` (`kumaryush18-cyber/Qronos-Code`) |
| Commit | `2c6500e` — feat(settings): show connected custom providers in the picker, hide dead cloud features |
| Tag | `qronos-baseline-1.0` |
| Extension tests | 660 pass, 1 known failure (`Agent Manager splash gating > defaults to legacy and switches live`, 5 s timeout, fails without our changes too) |
| opencode tests | 74 pass |
| core tests | 2 pass |
| Live gateway | `GET https://api.qronos.me/v1/models` → 200, 16 models |

## Phase 1 result (rename scope only)

| Gate | Result |
|---|---|
| `bun install` from scratch | pass (run 43797701883) |
| typecheck extension host | pass |
| typecheck webview | pass |
| no `@kilocode/` or `@opencode-ai/` left | pass |
| vsix linux-x64 | pass, 196 MB artifact, binary 319 MB class |
| vsix win32-x64 | pass, 198 MB |
| vsix darwin-arm64 | pass, 177 MB |

Workflow: `.github/workflows/rename-sweep.yml`, plus the inherited
`qronos-code-vsix.yml`.

## What phase 1 did NOT touch (still ahead)

- 6 787 tracked files still have `kilo` in their path, in 39 top-level folders
  (biggest: `packages/extension` 2 067, `packages/jetbrains` 1 381,
  `packages/cli` 1 204, `packages/docs` 993).
- 32 823 `kilo` occurrences inside `.ts`/`.tsx`.
- 295 distinct `KILO_*` environment variables.
- Package basenames still carry `kilo-` (`@qronos-ai/gateway`, …).

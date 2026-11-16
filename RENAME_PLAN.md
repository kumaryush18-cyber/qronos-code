# Rename plan — removing `kilocode` / `opencode` names from the codebase

Status: **not started**. This is a side plan, done on a copy so `main` keeps working.

## Why on a copy

A rename touches every import in the repo. If it is done on `main`, the
extension cannot be built or tested for hours and no bug can be fixed in the
meantime. A copy also lets us throw the whole thing away if it goes badly.

```
git clone /workspaces/qronos-code /workspaces/qronos-rename
cd /workspaces/qronos-rename
git checkout -b rename/scope
```

The current extension keeps working from `/workspaces/qronos-code` the whole
time. We only switch when the copy is green.

## Before we start: decide about upstream

Renaming kills cheap merges from Kilo. Do this rename **only if** the answer to
"do we still want Kilo's future fixes?" is no (or "cherry-pick only"). See
`UPSTREAM.md`.

## Phases

Each phase is one branch, one merge request, and must pass the gate before the
next phase starts. If a phase cannot be made green in one working day, stop and
keep the last green state.

### Phase 0 — freeze (5 min)

- Tag the working tree: `git tag qronos-baseline-1.0`.
- Record the current test results as the baseline: `bun test` per package.

**Gate:** tag exists, baseline numbers written down.

### Phase 1 — package scope (biggest, riskiest)

- `@kilocode/*` → `@qronos-ai/*`, `@opencode-ai/*` → `@qronos-ai/upstream-*`.
- Rewrite `package.json` of all 36 packages, every `import`, `bun.lock`,
  `turbo.json`, `tsconfig` paths.
- Do it with a script, not by hand: one codemod, reviewed as a diff.
- Regenerate the lockfile in one clean install.

**Gate:** `bun install` clean, `bun esbuild.js` builds, `bin/qronos` real binary
still starts, extension loads in a window.

**Effort:** 4–6 h. **Risk:** high (lockfile, native deps, `bin` names).

### Phase 2 — folder names (one folder per commit)

`packages/kilo-vscode` → `packages/extension`, `packages/opencode` →
`packages/cli`, `packages/kilo-gateway` → `packages/gateway`, etc.
Tooling paths (`turbo.json`, `.github/workflows/*`, `script/`) follow.

**Gate:** same as Phase 1, plus the VSIX still packages (`vsce package`).

**Effort:** 2–3 h. **Risk:** medium.

### Phase 3 — environment variables

`KILO_*` / `OPENCODE_*` → `QRONOS_*`, keeping a read-only fallback for one
release (`process.env.QRONOS_X ?? process.env.KILO_X`).

**Gate:** sign-in, model list and a chat turn work with only `QRONOS_*` set.

**Effort:** 2 h. **Risk:** medium (silent breakage if a var is missed).

### Phase 4 — config file names

`.kilo`, `.kilocode`, `kilo.json`, `opencode.json` → `.qronos`,
`qronos.json`. Already read-both today; this phase makes qronos the only
written form and drops the legacy fallbacks.

**Gate:** a repo with an old `kilo.json` still loads after the fallbacks are
removed (manual test with a fixture repo).

**Effort:** 2 h. **Risk:** low.

### Phase 5 — text, docs, CI

Comments, log prefixes, test names, `AGENTS.md`, `CONTRIBUTING.md`,
workflow names, artifact names, `LICENSE`/`NOTICE`.

**Gate:** `grep -ri "kilocode\|opencode" --include=*.ts --include=*.tsx`
returns only the files listed in `ATTRIBUTION.md`.

**Effort:** 2 h. **Risk:** low.

## What must NOT be removed

- MIT copyright lines of Kilo Code and OpenCode, and a `NOTICE` file saying this
  is a derivative work. Removing them breaks the licence.

## Switch-over

1. Build the VSIX from the copy, install it, use it for a day.
2. If nothing breaks, rename the GitHub repo's default branch to the new tree.
3. Keep the old branch `legacy/kilocode-names` forever as a fallback.

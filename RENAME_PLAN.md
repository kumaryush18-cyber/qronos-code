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

- `@qronos-ai/*` → `@qronos-ai/*`, `@qronos-ai/*` → `@qronos-ai/upstream-*`.
- Rewrite `package.json` of all 36 packages, every `import`, `bun.lock`,
  `turbo.json`, `tsconfig` paths.
- Do it with a script, not by hand: one codemod, reviewed as a diff.
- Regenerate the lockfile in one clean install.

**Gate:** `bun install` clean, `bun esbuild.js` builds, `bin/qronos` real binary
still starts, extension loads in a window.

**Effort:** 4–6 h. **Risk:** high (lockfile, native deps, `bin` names).

### Phase 2 — folder names (one folder per commit)

`packages/extension` → `packages/extension`, `packages/cli` →
`packages/cli`, `packages/gateway` → `packages/gateway`, etc.
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

## Status — 2026-11-16

Phases 1–5 were executed together on `kumaryush18-cyber/qronos-rename`, because
the word pass has to run once anyway; every step was pushed and checked by CI
before the next one started.

| Gate | Command | Result |
| --- | --- | --- |
| No old scope, no `kilo` word, no `kilo` path | `rename-sweep` | pass |
| Package names | `rename-sweep` | pass |
| Host + webview typecheck | `rename-sweep` | pass |
| Installer linux-x64 / win32-x64 / darwin-arm64 | `qronos-code-vsix` | pass |
| JetBrains Kotlin compile | `kotlin-and-docs-check` | pass |
| Docs site build | `kotlin-and-docs-check` | pass |

Facts worth remembering:

- 9,779 files changed in the folder + word pass.
- The word pass merged names that only differed by branding. Every merge had to
  be split again by hand: two SDK client classes (`Qronos` and
  `QronosGateway`), two Effect APIs (`qronos` and `qronos-gateway`), duplicate
  object keys, duplicate i18n keys, duplicate env keys.
- `packages/sdk/js/src/v2/gen/sdk.gen.ts` is generated. Regenerating it from the
  new spec keeps the split; do not hand-edit it again.

## Phase 6 and later — what is still open

### Phase 6 — prove the product, not just the build

1. Run the JetBrains `:test` task (only `compileTestKotlin` is green today).
2. Install the linux VSIX in a clean VS Code and do one sign-in + one chat turn.
3. Repeat on Windows and macOS with the matching installer.
4. Confirm `bin/qronos` inside the package reports the Qronos version.

**Gate:** sign-in, model list and one chat turn work on all three systems.

### Phase 7 — switch over

1. Point `kumaryush18-cyber/qronos-code` at this tree, or make this repo the
   main development repo.
2. Keep `qronos-code` as an archive with a README that points here.
3. Update the installed dev extension to the new package name
   (`qronos-ai.qronos-code` stays the same, so a reload is enough).

**Gate:** the extension you use daily comes from this repo.

### Phase 8 — make the package smaller

The linux VSIX is 206 MB, mostly `bin/qronos` (312 MB raw) and `bin/ffmpeg`
(68 MB). Candidate removals: `tests/`, `.storybook/`, KaTeX fonts,
`playwright-core`, `chromium-bidi`.

**Gate:** package under 120 MB and a chat turn still works.

### Phase 9 — release and publish

1. GitHub Release with the three installers attached.
2. `vsce publish` to the marketplace under the `qronos-ai` publisher.
3. JetBrains Marketplace: vendor account, signing key, review, pricing.
4. Docs: host `packages/docs` somewhere permanent.

**Gate:** a stranger can install from a public page, without a build.

### Phase 10 — upstream policy

`UPSTREAM.md` option B: cherry-pick security and serious fixes only, never a
full merge. Do one dry run of the cherry-pick helper on the new tree and write
down how long it takes.

**Gate:** one upstream fix lands through the helper without touching branding.

---
name: jetbrains-cli-pin
description: Use when pinning or unpinning the CLI version the Qronos JetBrains plugin uses, or fresh-regenerating the local repo CLI. Cleans all leftover CLI binaries and build artifacts in the current worktree so every operation starts from a fresh, artifact-free state.
---

# JetBrains CLI Pin

Pin the Qronos JetBrains plugin to the latest released CLI, unpin it to use the local
repo CLI, or fresh-regenerate the local CLI while unpinned. Every command first cleans
all CLI/pin build artifacts and binaries in the current worktree so the result never
carries state from a previous run.

Run all commands from the repository root of the worktree you want to affect. Paths are
relative, so they resolve to the current worktree, not the main checkout.

## Two Controls

The plugin's CLI behavior is governed by two independent values:

| Control | Location | Meaning |
|---|---|---|
| Pin mode | `packages/jetbrains/gradle.properties` -> `qronos.cli.pinned` | `true` = download the released CLI at build/connect time. `false` = build and bundle the local repo CLI. |
| Pinned version | `packages/jetbrains/package.json` -> `version` | Which GitHub CLI release is downloaded and generated from when `pinned=true`. |

"Pin to latest" means `qronos.cli.pinned=true` **and** `package.json` set to the latest
stable CLI release. "Unpin" means `qronos.cli.pinned=false` with a freshly built local CLI
bundled.

## Commands

```bash
bun .qronos/skills/jetbrains-cli-pin/script/cli-pin.ts <command> [--no-verify]
```

| Command | Steps |
|---|---|
| `pin` | Clean -> set `qronos.cli.pinned=true` -> remove the repo-CLI Bun path hint -> bump `package.json` to latest release (via `set-pin.ts --latest`, which validates release assets) -> verify with a cold `gradlew clean typecheck`. |
| `unpin` | Clean -> set `qronos.cli.pinned=false` -> write the repo-CLI Bun path hint -> `:backend:buildRepoCli` (fresh CLI) -> `:backend:stageRepoCli` -> assert staged `qronos-cli.zip` -> verify with `gradlew typecheck`. |
| `regen` | Fast dev loop while unpinned: refresh the repo-CLI Bun path hint -> `rm -rf dist` -> `buildRepoCli` -> `stageRepoCli`. Refuses to run unless `qronos.cli.pinned=false`. |
| `clean` | Run the shared artifact clean only. |

`--no-verify` skips the gradle verification build (rewrites + clean only). Use it when
offline or without Java 21.

## Cleaned Artifacts

`clean()` runs `./gradlew clean` plus targeted deletes. All paths are gitignored, so
tracked files are never touched. The clean removes the stale artifacts that otherwise
leak across a pin/unpin flip:

| Artifact | Path |
|---|---|
| Repo CLI binaries | `packages/cli/dist/` |
| Staged CLI archive | `packages/jetbrains/backend/build/generated/qronos-cli-res/qronos-cli.zip` |
| Generated props / checksums / OpenAPI client | `packages/jetbrains/backend/build/generated/` |
| Compiled resources (bundled zip on classpath) | `packages/jetbrains/backend/build/resources/` |
| CLI download cache | `packages/jetbrains/backend/build/cli-cache/` |

The staged `qronos-cli.zip` is the nastiest leak: once it lands in `backend/build/resources/main/`
from an unpinned build, runtime prefers the bundled zip over downloading. A full clean is
the only reliable reset.

## Bun Path Hint

In repo CLI mode, Gradle's `generateOpenApiSpec` task runs the local CLI source through
`bun run --conditions=browser ./src/index.ts generate`. IDE-launched Gradle runs can have
a stripped `PATH` where `bun` isn't resolvable. The `unpin`/`regen` commands write an ignored, worktree-local hint:

```text
packages/jetbrains/.gradle/qronos-cli-pin.properties
```

The file contains `bun.path=<absolute path>` and is consumed by `backend/build.gradle.kts`
for repo CLI tasks. `pin` removes it because pinned mode should not depend on local Bun.

## Notes

- Verification builds pass `--no-configuration-cache` so the changed `qronos.cli.pinned`
  value is re-read instead of served from the on-disk Gradle configuration cache.
- The `pin` verification is a cold build: it downloads the pinned CLI release via
  `generateOpenApiSpec` and needs network access plus Java 21. Use `--no-verify` offline.
- `qronos.cli.pinned=false` is dev-only and not releasable. Production Gradle builds,
  `script/build-version.sh`, and the release scripts hard-fail on `false` -- run `pin`
  before releasing.

## Related

- Version-bump and release-gating logic lives in the `/release-jetbrains` command
  (`.qronos/command/release-jetbrains.md`); this skill reuses its `set-pin.ts` and
  `pin-common.ts` helpers from `.qronos/skills/release-jetbrains/script/`.
- Background on the build wiring: the "CLI Pinning, Unpinning, and Bumping" section of
  the `jetbrains-dev` skill (`.qronos/skills/jetbrains-dev/SKILL.md`).

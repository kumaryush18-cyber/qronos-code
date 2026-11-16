#!/usr/bin/env bun
// qronos_change - new file

/**
 * Guards generated Qronos config dependency artifacts.
 *
 * Qronos loads project config from .qronos/ and .qronos/ and installs
 * @qronos-ai/plugin there at runtime. npm writes package.json, lockfiles,
 * .gitignore, and node_modules as generated local state. These paths must stay
 * untracked so background installs do not create recurring branch diffs.
 */

import { spawnSync } from "node:child_process"

const paths = [
  ".qronos/.gitignore",
  ".qronos/package.json",
  ".qronos/package-lock.json",
  ".qronos/pnpm-lock.yaml",
  ".qronos/bun.lock",
  ".qronos/yarn.lock",
  ".qronos/node_modules",
  ".qronos/.gitignore",
  ".qronos/package.json",
  ".qronos/package-lock.json",
  ".qronos/pnpm-lock.yaml",
  ".qronos/bun.lock",
  ".qronos/yarn.lock",
  ".qronos/node_modules",
]

const git = spawnSync("git", ["ls-files", "-z", "--", ...paths], { encoding: "utf8" })

if (git.status !== 0) {
  console.error(git.stderr.trim() || "git ls-files failed")
  process.exit(1)
}

const bad = git.stdout.split("\0").filter(Boolean).sort()

if (bad.length === 0) {
  console.log("check-qronos-generated-artifacts: ok")
  process.exit(0)
}

console.error("Generated Qronos config dependency artifacts are tracked:")
for (const file of bad) console.error(`  ${file}`)
console.error("")
console.error("These files are created by runtime dependency installs in .qronos/ and .qronos/.")
console.error("Remove them from git and keep them ignored.")
process.exit(1)

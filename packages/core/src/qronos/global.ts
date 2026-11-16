import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

/**
 * Like `fs.mkdir({ recursive: true })` but also repairs broken symlinks and
 * junctions whose target no longer exists (a Windows edge-case where the user
 * had a junction at e.g. `~/.qronos` pointing to a deleted directory).
 *
 * `fs.mkdir({ recursive: true })` silently no-ops when a junction exists even
 * if its target is gone, so subsequent writes inside that path fail with ENOENT.
 * We detect this by calling `fs.stat` (which follows the symlink/junction) after
 * mkdir: if stat fails the entry is broken and we remove + recreate it.
 */
export async function ensureRealDir(p: string) {
  await fs.mkdir(p, { recursive: true })
  const ok = await fs
    .stat(p)
    .then(() => true)
    .catch(() => false)
  if (!ok) {
    await fs.rm(p, { force: true })
    await fs.mkdir(p, { recursive: true })
  }
}

async function writable(p: string) {
  const probe = path.join(p, `.qronos-write-${process.pid}-${randomUUID()}`)
  await fs.writeFile(probe, "", { flag: "wx", mode: 0o600 })
  await fs.unlink(probe)
}

async function ready(p: string) {
  await ensureRealDir(p)
  await writable(p)
}

export async function resolveState(p: string, fallback?: string) {
  const sticky =
    fallback === undefined
      ? false
      : await fs.stat(fallback).then(
          (stat) =>
            stat.isDirectory() &&
            writable(fallback).then(
              () => true,
              () => false,
            ),
          () => false,
        )
  if (sticky && fallback !== undefined) return fallback

  const err = await ready(p).then(
    () => undefined,
    (err: unknown) => err,
  )
  if (err === undefined) return p
  if (fallback === undefined) throw err

  const failed = await ready(fallback).then(
    () => undefined,
    (err: unknown) => err,
  )
  if (failed !== undefined) {
    throw new AggregateError([err, failed], `Cannot use state directory "${p}" or fallback "${fallback}"`)
  }

  const msg = err instanceof Error ? err.message : "Unknown error"
  // Logging is not initialized until Global.Path.log exists.
  console.warn(`[qronos] Cannot use state directory "${p}"; using "${fallback}" instead: ${msg}`)
  return fallback
}

/**
 * qronos_change - one-time move of the old "qronos" app directories to "qronos".
 *
 * Every directory is moved only when the new path does not exist yet, so this
 * runs at most once per directory and never overwrites user data. A failed move
 * (e.g. the two paths are on different devices) falls back to a copy, and any
 * remaining error is logged and ignored - startup must not depend on it.
 */
export async function migrateLegacyAppDirs(pairs: Array<{ next: string; legacy: string }>) {
  for (const { next, legacy } of pairs) {
    if (next === legacy) continue
    const existing = await fs.stat(next).then(
      (stat) => stat.isDirectory(),
      () => false,
    )
    if (existing) continue
    const legacyExists = await fs.stat(legacy).then(
      (stat) => stat.isDirectory(),
      () => false,
    )
    if (!legacyExists) continue
    await fs.mkdir(path.dirname(next), { recursive: true })
    const moved = await fs.rename(legacy, next).then(
      () => true,
      () => false,
    )
    if (moved) continue
    await fs.cp(legacy, next, { recursive: true, force: false, errorOnExist: false }).catch((err: unknown) => {
      console.warn(`[qronos] Could not migrate "${legacy}" to "${next}":`, err)
    })
  }
}

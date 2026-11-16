import { Flag } from "@qronos-ai/core/flag/flag"
import { Effect } from "effect"
import path from "path"

const preserveExerciseGlobalRoot = !!process.env.QRONOS_HTTPAPI_EXERCISE_GLOBAL
export const exerciseGlobalRoot =
  process.env.QRONOS_HTTPAPI_EXERCISE_GLOBAL ??
  path.join(process.env.TMPDIR ?? "/tmp", `opencode-httpapi-global-${process.pid}`)
process.env.XDG_DATA_HOME = path.join(exerciseGlobalRoot, "data")
process.env.XDG_CONFIG_HOME = path.join(exerciseGlobalRoot, "config")
process.env.XDG_STATE_HOME = path.join(exerciseGlobalRoot, "state")
process.env.XDG_CACHE_HOME = path.join(exerciseGlobalRoot, "cache")
process.env.QRONOS_DISABLE_SHARE = "true"
process.env.QRONOS_DISABLE_SESSION_INGEST = "true" // qronos_change - isolate the exerciser from async Qronos session sync
process.env.QRONOS_DISABLE_PRESENCE = "1" // qronos_change - presence now has a default Event Service URL; never open real sockets from the exerciser
process.env.QRONOS_DISABLE_CODEBASE_INDEXING = "vscode-no-workspace" // qronos_change - route scenarios do not need an indexing worker per temp project
process.env.QRONOS_MARKETPLACE_BASE_URL = "http://127.0.0.1:9" // qronos_change - keep marketplace catalog fetches hermetic; the list scenario degrades to an empty catalog instead of calling api.qronos.ai
export const exerciseConfigDirectory = path.join(exerciseGlobalRoot, "config", "opencode")
export const exerciseDataDirectory = path.join(exerciseGlobalRoot, "data", "qronos") // qronos_change

const preserveExerciseDatabase = !!process.env.QRONOS_HTTPAPI_EXERCISE_DB
export const exerciseDatabasePath =
  process.env.QRONOS_HTTPAPI_EXERCISE_DB ??
  path.join(process.env.TMPDIR ?? "/tmp", `opencode-httpapi-exercise-${process.pid}.db`)
process.env.QRONOS_DB = exerciseDatabasePath
Flag.QRONOS_DB = exerciseDatabasePath

export const original = {
  QRONOS_SERVER_PASSWORD: Flag.QRONOS_SERVER_PASSWORD,
  QRONOS_SERVER_USERNAME: Flag.QRONOS_SERVER_USERNAME,
}

export const cleanupExercisePaths = Effect.promise(async () => {
  const fs = await import("fs/promises")
  if (!preserveExerciseDatabase) {
    await Promise.all(
      [exerciseDatabasePath, `${exerciseDatabasePath}-wal`, `${exerciseDatabasePath}-shm`].map((file) =>
        fs.rm(file, { force: true }).catch(() => undefined),
      ),
    )
  }
  if (!preserveExerciseGlobalRoot)
    await fs.rm(exerciseGlobalRoot, { recursive: true, force: true }).catch(() => undefined)
})

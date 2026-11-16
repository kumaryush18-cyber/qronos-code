import path from "path"
import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import os from "os"
import { Context, Effect, Layer } from "effect"
import { Flock } from "./util/flock"
import { markNoIndex } from "./qronos/spotlight" // qronos_change
import { ensureRealDir, migrateLegacyAppDirs, resolveState } from "./qronos/global" // qronos_change
import { Flag } from "./flag/flag"
import { makeGlobalNode } from "./effect/app-node"

const app = "qronos" // qronos_change - was "qronos"
const legacyApp = "qronos" // qronos_change
// qronos_change start
// Defensively strip newline characters from the resolved XDG paths.
// If `$HOME` (or any `$XDG_*_HOME` override) has a trailing newline in
// the user's shell — e.g. because a shell snippet did `export HOME=$(cmd)`
// against a command with an implicit newline — the unsanitised path
// makes `fs.mkdir` try to create `/Users/<name>\n` and fail with EACCES,
// which breaks every `qronos` invocation at startup (including the SDK
// regen that runs during `bun run extension`).
const clean = (p: string | undefined) => p?.replace(/[\r\n]+/g, "")
const data = path.join(clean(xdgData)!, app)
const cache = path.join(clean(xdgCache)!, app)
const config = path.join(clean(xdgConfig)!, app)
const preferred = path.join(clean(xdgState)!, app)
// qronos_change start - move ~/.{data,cache,config,state}/qronos to /qronos once
await migrateLegacyAppDirs([
  { next: data, legacy: path.join(clean(xdgData)!, legacyApp) },
  { next: cache, legacy: path.join(clean(xdgCache)!, legacyApp) },
  { next: config, legacy: path.join(clean(xdgConfig)!, legacyApp) },
  { next: preferred, legacy: path.join(clean(xdgState)!, legacyApp) },
])
// qronos_change end
const state = await resolveState(preferred, process.env.XDG_STATE_HOME ? undefined : path.join(data, "state"))
// qronos_change end
const tmp = path.join(os.tmpdir(), app)

const paths = {
  get home() {
    return (process.env.QRONOS_TEST_HOME ?? os.homedir()).trim() // qronos_change — defensive trim, see above
  },
  data,
  bin: path.join(cache, "bin"),
  log: path.join(data, "log"),
  repos: path.join(data, "repos"),
  cache,
  config,
  state,
  tmp,
}

export const Path = paths

Flock.setGlobal({ state })

await Promise.all([
  ensureRealDir(Path.data), // qronos_change
  ensureRealDir(Path.config), // qronos_change
  ensureRealDir(Path.tmp), // qronos_change
  ensureRealDir(Path.log), // qronos_change
  ensureRealDir(Path.bin), // qronos_change
  ensureRealDir(Path.repos), // qronos_change
])

// qronos_change start - keep generated Qronos data out of macOS Spotlight
await Promise.all([Path.data, Path.cache, Path.state].map(markNoIndex))
// qronos_change end

export class Service extends Context.Service<Service, Interface>()("@opencode/Global") {}

export interface Interface {
  readonly home: string
  readonly data: string
  readonly cache: string
  readonly config: string
  readonly state: string
  readonly tmp: string
  readonly bin: string
  readonly log: string
  readonly repos: string
}

export function make(input: Partial<Interface> = {}): Interface {
  return {
    home: Path.home,
    data: Path.data,
    cache: Path.cache,
    config: Flag.QRONOS_CONFIG_DIR ?? Path.config,
    state: Path.state,
    tmp: Path.tmp,
    bin: Path.bin,
    log: Path.log,
    repos: Path.repos,
    ...input,
  }
}

const layer = Layer.effect(
  Service,
  Effect.sync(() => Service.of(make())),
)

export const node = makeGlobalNode({ service: Service, layer: layer, deps: [] })

export const layerWith = (input: Partial<Interface>) =>
  Layer.effect(
    Service,
    Effect.sync(() => Service.of(make(input))),
  )

export * as Global from "./global"

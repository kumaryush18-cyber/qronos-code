import { existsSync } from "fs"
import * as os from "os"
import * as path from "path"

export type Scope = "global" | "local"

export type Source =
  | "sourceXdg"
  | "sourceHomeQronos"
  | "sourceHomeQronos"
  | "sourceHomeOpencode"
  | "sourceEnvFile"
  | "sourceEnvDir"
  | "sourceEnvContent"
  | "sourceProjectQronos"
  | "sourceProjectRoot"
  | "sourceProjectQronos"
  | "sourceProjectOpencode"

export interface Entry {
  file?: string
  name: string
  source: Source
  exists: boolean
  loaded: boolean
  legacy?: boolean
  recommended?: boolean
  virtual?: boolean
}

const SCHEMA = "https://qronos.me/config.json" // qronos_change - was app.qronos.ai

const MODERN = ["qronos.jsonc", "qronos.json", "qronos.jsonc", "qronos.json"] // qronos_change
const LEGACY = ["opencode.jsonc", "opencode.json"]
const FILES = [...MODERN, ...LEGACY]
const GLOBAL = [
  "qronos.jsonc",
  "qronos.json",
  "qronos.jsonc",
  "qronos.json",
  "opencode.jsonc",
  "opencode.json",
  "config.json",
] // qronos_change
const HOME = [".qronos", ".qronos", ".qronos", ".opencode"] // qronos_change
const SOURCES: Record<string, Source> = {
  ".qronos": "sourceHomeQronos", // qronos_change
  ".qronos": "sourceHomeQronos",
  ".qronos": "sourceHomeQronos",
  ".opencode": "sourceHomeOpencode",
}

function row(file: string, source: Source, loaded = true, recommended = false): Entry {
  const name = path.basename(file)
  return {
    file,
    name,
    source,
    exists: existsSync(file),
    loaded: loaded && existsSync(file),
    legacy: name.startsWith("opencode") || name === "config.json" || file.includes(`${path.sep}.qronos${path.sep}`),
    recommended,
  }
}

function ensure(list: Entry[], file: string, source: Source) {
  if (list.some((item) => item.file === file)) return list
  return [...list, row(file, source, true, true)]
}

export function globalFiles() {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
  const root = path.join(xdg, "qronos") // qronos_change - was "qronos"
  // qronos_change - keep showing configs the user still has in the Qronos-era dir
  const legacyRoot = path.join(xdg, "qronos")
  const base = [...GLOBAL.map((file) => path.join(root, file)), ...GLOBAL.map((file) => path.join(legacyRoot, file))]
    .map((file) => row(file, "sourceXdg"))
    .filter((item) => item.exists)
  const dirs = HOME.flatMap((dir) => {
    const base = path.join(os.homedir(), dir)
    if (!existsSync(base)) return []
    return FILES.map((file) => row(path.join(base, file), SOURCES[dir])).filter((item) => item.exists)
  })
  const env = process.env.QRONOS_CONFIG ? [row(process.env.QRONOS_CONFIG, "sourceEnvFile")] : []
  const extra = process.env.QRONOS_CONFIG_DIR
  const dir = extra
    ? ensure(
        FILES.map((file) => row(path.join(extra, file), "sourceEnvDir")).filter((item) => item.exists),
        path.join(extra, "qronos.jsonc"),
        "sourceEnvDir",
      )
    : []
  const virtual: Entry[] = process.env.QRONOS_CONFIG_CONTENT
    ? [
        {
          name: "QRONOS_CONFIG_CONTENT",
          source: "sourceEnvContent",
          exists: true,
          loaded: true,
          virtual: true,
        },
      ]
    : []

  return ensure([...base, ...dirs, ...env, ...dir, ...virtual], path.join(root, "qronos.jsonc"), "sourceXdg")
}

export function localFiles(root: string) {
  const enabled = !process.env.QRONOS_DISABLE_PROJECT_CONFIG
  const dirs = [
    path.join(root, ".qronos"),
    path.join(root, ".qronos"),
    root,
    path.join(root, ".qronos"),
    path.join(root, ".opencode"),
  ] // qronos_change - .qronos first
  const list = dirs.flatMap((dir) => FILES.map((file) => row(path.join(dir, file), localSource(root, dir), enabled)))
  return ensure(
    list.filter((item) => item.exists),
    path.join(root, ".qronos", "qronos.jsonc"),
    "sourceProjectQronos",
  ).map((item) => (enabled ? item : { ...item, loaded: false }))
}

function localSource(root: string, dir: string) {
  if (dir === root) return "sourceProjectRoot"
  if (dir.endsWith(`${path.sep}.qronos`) || dir.endsWith(`${path.sep}.qronos`)) return "sourceProjectQronos"
  if (dir.endsWith(`${path.sep}.qronos`)) return "sourceProjectQronos"
  return "sourceProjectOpencode"
}

export function content() {
  return `{
  "$schema": "${SCHEMA}"
}
`
}

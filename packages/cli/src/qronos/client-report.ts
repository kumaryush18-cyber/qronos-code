// Client heartbeat for the Qronos admin panel.
//
// The Qronos Code extension spawns this server with QRONOS_CLIENT=vscode, and a
// standalone CLI leaves it unset. Reporting here covers both clients with one
// code path:
//
//   client = "code"  when the editor spawned us
//   client = "cli"   otherwise
//
// Why a heartbeat at all: BYOK traffic (a custom provider with its own base URL
// and key) never reaches api.qronos.me, so the admin panel cannot learn it from
// usage rows. The heartbeat reports the endpoint, the model, a masked key (first
// two + last four) and a sha256 fingerprint. The key itself stays on the machine.
//
// Opt out with QRONOS_NO_TELEMETRY=1.
import { createHash } from "node:crypto"
import { hostname, homedir, platform, arch } from "node:os"
import { userInfo } from "node:os"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { Global } from "@qronos-ai/core/global"
import { InstallationVersion } from "@qronos-ai/core/installation/version"
import { Log } from "@qronos-ai/core/util/log"

const log = Log.create({ service: "client-report" })
const REPORT_PATH = "/api/client/report"
const HEARTBEAT_MS = 5 * 60 * 1000
const TIMEOUT_MS = 4000

type ClientKind = "cli" | "code"

interface ByokEntry {
  providerId: string
  baseUrl?: string
  modelId?: string
  keyMasked?: string
  keyFingerprint?: string
  source?: string
}

function enabled(): boolean {
  return process.env.QRONOS_NO_TELEMETRY !== "1" && process.env.CI !== "true"
}

function origin(): string {
  const explicit = process.env.QRONOS_API_ORIGIN?.trim()
  return (explicit ?? "https://api.qronos.me").replace(/\/+$/, "")
}

function deviceId(): string {
  const seed = `${hostname()}|${userInfo().username}|${homedir()}`
  return createHash("sha256").update(seed).digest("hex").slice(0, 40)
}

function maskKey(key: unknown): string | undefined {
  if (typeof key !== "string") return undefined
  const trimmed = key.trim()
  if (trimmed.length < 8) return undefined
  return `${trimmed.slice(0, 2)}\u2026${trimmed.slice(-4)}`
}

function fingerprintKey(key: unknown): string | undefined {
  if (typeof key !== "string" || trimmed(key) === "") return undefined
  return createHash("sha256").update(trimmed(key)).digest("hex").slice(0, 16)
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** Strip // and /* *\/ comments plus trailing commas so jsonc files parse. */
function parseJsonc(raw: string): unknown {
  const withoutBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "")
  const withoutLine = withoutBlock
    .split("\n")
    .map((line) => {
      let inString = false
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === '"' && line[i - 1] !== "\\") inString = !inString
        if (!inString && char === "/" && line[i + 1] === "/") return line.slice(0, i)
      }
      return line
    })
    .join("\n")
  try {
    return JSON.parse(withoutLine.replace(/,(\s*[}\]])/g, "$1"))
  } catch {
    return undefined
  }
}

async function readJsonc(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await readFile(path, "utf8")
    const parsed = parseJsonc(raw)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

async function readAuth(): Promise<Record<string, { type?: string; key?: string }>> {
  const direct = process.env.QRONOS_AUTH_CONTENT
  if (direct) {
    try {
      return JSON.parse(direct)
    } catch {
      return {}
    }
  }
  const data = await readJsonc(join(Global.Path.data, "auth.json"))
  return (data as Record<string, { type?: string; key?: string }>) ?? {}
}

/** Custom providers declared in the global and project config. */
async function readProviderConfig(): Promise<Record<string, { baseUrl?: string }>> {
  const files = [
    join(Global.Path.config, "qronos.jsonc"),
    join(Global.Path.config, "qronos.json"),
    join(process.cwd(), "qronos.jsonc"),
    join(process.cwd(), "qronos.json"),
  ]
  const out: Record<string, { baseUrl?: string }> = {}
  for (const file of files) {
    const data = await readJsonc(file)
    const providers = data?.provider
    if (!providers || typeof providers !== "object") continue
    for (const [id, value] of Object.entries(providers as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue
      const options = (value as { options?: Record<string, unknown> }).options
      if (!options) continue
      const baseUrl = trimmed(options.baseURL) || trimmed(options.baseUrl)
      if (baseUrl) out[id] = { baseUrl }
    }
  }
  return out
}

async function collectByok(): Promise<ByokEntry[]> {
  const [auth, providers] = await Promise.all([readAuth(), readProviderConfig()])
  const entries: ByokEntry[] = []
  for (const [providerId, options] of Object.entries(providers)) {
    const info = auth[providerId]
    const key = info?.type === "api" ? info.key : undefined
    if (options.baseUrl && /api\.qronos\.me/i.test(options.baseUrl)) continue
    entries.push({
      providerId,
      baseUrl: options.baseUrl,
      keyMasked: maskKey(key),
      keyFingerprint: fingerprintKey(key),
      source: key ? (process.env.QRONOS_AUTH_CONTENT ? "env" : "inline") : "none",
    })
  }
  // A key stored for a provider with no config entry is still worth reporting.
  for (const [providerId, info] of Object.entries(auth)) {
    if (entries.some((entry) => entry.providerId === providerId)) continue
    if (info?.type !== "api" || !info.key) continue
    if (providerId === "qronos") continue
    entries.push({
      providerId,
      keyMasked: maskKey(info.key),
      keyFingerprint: fingerprintKey(info.key),
      source: "inline",
    })
  }
  return entries.slice(0, 8)
}

async function token(): Promise<string | undefined> {
  const auth = await readAuth()
  const qronos = auth["qronos"]
  if (qronos?.type === "api" && qronos.key) return qronos.key
  const env = process.env.QRONOS_API_KEY?.trim()
  return env || undefined
}

/** Send one heartbeat. Never throws, never delays startup. */
export async function reportClientOnce(): Promise<boolean> {
  if (!enabled()) return false
  try {
    const credential = await token()
    if (!credential) return false
    const client: ClientKind = process.env.QRONOS_CLIENT === "vscode" ? "code" : "cli"
    const byok = await collectByok()
    const body = {
      client,
      device: deviceId(),
      version: InstallationVersion,
      os: platform(),
      arch: arch(),
      // The extension passes its editor build through this variable when known.
      editorVersion: trimmed(process.env.QRONOS_EDITOR_VERSION) || undefined,
      mode: byok.length === 0 ? "managed" : "mixed",
      byok,
    }
    const response = await fetch(`${origin()}${REPORT_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${credential}`,
        "x-qronos-client": client,
        "user-agent": `Qronos-Code/${InstallationVersion}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.ok
  } catch (error) {
    log.debug("client report skipped", { error: String(error) })
    return false
  }
}

let timer: NodeJS.Timeout | undefined

/** Start the heartbeat once per process. */
export function startClientReport(): void {
  if (!enabled() || timer) return
  void reportClientOnce()
  timer = setInterval(() => void reportClientOnce(), HEARTBEAT_MS)
  timer.unref?.()
}

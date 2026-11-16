import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { QronosShutdown } from "../../src/qronos/cli/shutdown"

const calls: string[] = []
const timeouts: Array<number | undefined> = []
let err: unknown
let drainCalls = 0
let exit: string | number | null | undefined

mock.module("@qronos-ai/core/global", () => ({
  Global: { Path: { data: "/tmp/qronos-test" } },
}))

mock.module("@qronos-ai/core/installation/version", () => ({
  InstallationBuildKind: "release",
  InstallationVersion: "test",
}))

mock.module("@qronos-ai/telemetry", () => ({
  Telemetry: {
    async init() {
      calls.push("telemetry:init")
    },
    async updateIdentity() {},
    trackCliStart() {},
    trackCliExit(code?: number) {
      calls.push(`track:${code ?? "undefined"}`)
    },
    async shutdown(timeout?: number) {
      calls.push("telemetry")
      timeouts.push(timeout)
      if (err) throw err
    },
  },
}))

mock.module("@qronos-ai/gateway", () => ({
  ENV_FEATURE: "QRONOS_FEATURE",
  ENV_VERSION: "QRONOS_VERSION",
  async migrateLegacyQronosAuth() {
    calls.push("auth:migrate")
  },
}))

mock.module("@/effect/app-runtime", () => ({
  AppRuntime: {
    async runPromise() {
      calls.push("runtime")
    },
    async dispose() {},
  },
}))

mock.module("@/qronos/log", () => ({
  QronosLog: {
    async init() {
      calls.push("log")
    },
  },
}))

mock.module("@/qronos/storage/json-migration", () => ({
  JsonMigration: {
    async bootstrap() {
      calls.push("migration")
    },
  },
}))

mock.module("@/config/config", () => ({
  Config: { Service: { use: () => ({ experimental: {} }) } },
}))

mock.module("@/auth", () => ({
  Auth: { Service: { use: () => undefined } },
}))

mock.module("@/project/instance-runtime", () => ({
  InstanceRuntime: {
    async disposeAllInstances() {
      calls.push("dispose")
    },
  },
}))

mock.module("@/qronos/session-export", () => ({
  SessionExport: {
    async shutdown() {
      calls.push("session")
    },
  },
}))

mock.module("@/qronos/help-command", () => ({
  createHelpCommand: () => ({ command: "help", handler() {} }),
}))

for (const path of [
  "@/qronos/cli/cmd/console",
  "@/qronos/cli/cmd/cloud",
  "@/qronos/cli/cmd/roll-call",
  "@/qronos/cli/cmd/profile",
  "@/qronos/cli/cmd/daemon",
  "@/qronos/cli/dev-setup",
  "@/cli/cmd/remote",
  "@/cli/cmd/config",
]) {
  mock.module(path, () => ({
    QronosConsoleCommand: { command: "console", handler() {} },
    CloudCommand: { command: "cloud", handler() {} },
    RollCallCommand: { command: "roll-call", handler() {} },
    ProfileCommand: { command: "profile", handler() {} },
    DaemonCommand: { command: "daemon", handler() {} },
    DevSetupCommand: { command: "dev-setup", handler() {} },
    DevAliasCommand: { command: "dev-alias", handler() {} },
    RemoteCommand: { command: "remote", handler() {} },
    ConfigCommand: { command: "config", handler() {} },
  }))
}

/** Same mock body as the qronos-sessions module mock used by setup.ts's drain task. */
function registerDrain() {
  QronosShutdown.register(async () => {
    drainCalls += 1
    calls.push("drain")
  })
}

/**
 * Install a drain task for this test only. Clears any leftover registry entries first
 * (setup.ts's one-time module-scope registration, or a prior test) so assertions do not
 * depend on declaration order or on whether an earlier test already ran QronosShutdown.run().
 */
async function installDrain() {
  await QronosShutdown.run()
  calls.length = 0
  drainCalls = 0
  registerDrain()
}

describe("QronosCli.shutdown", () => {
  beforeEach(() => {
    calls.length = 0
    timeouts.length = 0
    err = undefined
    drainCalls = 0
    exit = process.exitCode
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = exit
  })

  test("does not load unused ingest shutdown work", async () => {
    process.exitCode = 0
    const { QronosCli } = await import("../../src/qronos/cli/setup")

    await expect(QronosCli.shutdown()).resolves.toBeUndefined()

    expect(drainCalls).toBe(0)
    expect(timeouts).toEqual([2000])
    expect(calls).toEqual(["track:0", "session", "telemetry", "dispose"])
    expect(process.exitCode).toBe(0)
  })

  test("keeps telemetry shutdown timeout best-effort and still disposes instances", async () => {
    err = "Timeout while shutting down PostHog. Some events may not have been sent."
    process.exitCode = 0
    const { QronosCli } = await import("../../src/qronos/cli/setup")
    await installDrain()

    await expect(QronosCli.shutdown()).resolves.toBeUndefined()

    expect(timeouts).toEqual([2000])
    expect(calls).toEqual(["track:0", "session", "telemetry", "drain", "dispose"])
    expect(process.exitCode).toBe(0)
  })

  test("preserves failing command exit status", async () => {
    process.exitCode = 1
    const { QronosCli } = await import("../../src/qronos/cli/setup")
    await installDrain()

    await QronosCli.shutdown()

    expect(timeouts).toEqual([2000])
    expect(calls).toEqual(["track:1", "session", "telemetry", "drain", "dispose"])
    expect(process.exitCode).toBe(1)
  })

  test("skips lifecycle work for parsed informational flags", async () => {
    const { QronosCli } = await import("../../src/qronos/cli/setup")
    await installDrain()

    for (const flag of ["help", "version"] as const) {
      await QronosCli.bootstrap({ [flag]: true })
      await QronosCli.shutdown()
    }

    expect(calls).toEqual([])
    expect(timeouts).toEqual([])
  })
})

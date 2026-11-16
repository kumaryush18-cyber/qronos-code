import type { Argv } from "yargs"
import type { Auth } from "@/auth"
import * as Log from "@qronos-ai/core/util/log"
import { InstallationBuildKind, InstallationVersion } from "@qronos-ai/core/installation/version"
import { QronosShutdown } from "@/qronos/cli/shutdown"
import { createHelpCommand } from "@/qronos/help-command"
import { hasLazyCommandSelection } from "@/qronos/cli/lazy-commands"
import {
  AutoCommand,
  CloudCommand,
  ConfigCLICommand,
  DaemonCommand,
  DevAliasCommand,
  DevSetupCommand,
  QronosConsoleCommand,
  ProfileCommand,
  PtySmokeCommand,
  RemoteCommand,
  RollCallCommand,
  WorktreeCommand,
} from "@/qronos/cli/lazy-qronos-commands"

const log = Log.create({ service: "qronos.cli" })

// All Qronos-specific CLI customization lives here so the shared upstream entrypoint
// (src/index.ts) only needs a handful of thin call-sites behind qronos_change markers.
// This keeps index.ts close to upstream and reduces merge conflicts on every sync.
//
// Startup cost note: this module is imported eagerly from src/index.ts, so its static
// import graph must stay light. Heavy dependencies (telemetry, gateway auth migration,
// AppRuntime, config, auth, session-export, JSON migration) are dynamically imported
// inside the function that needs them, following the deferral pattern upstream applied
// in opencode#30453. The registered command modules must follow the same rule: a light
// top level, with implementation imports inside their handlers.
export namespace QronosCli {
  let info = false
  let narrow = false

  export function workerTui(opts: { [key: string]: unknown }) {
    return !hasLazyCommandSelection() && opts.mini !== true && !opts.worktree
  }

  // Register only the Qronos-specific commands. Upstream commands stay in index.ts's chain so
  // upstream merges that add or remove commands keep working without touching this file.
  export function register<T>(cli: Argv<T>): Argv<T> {
    cli
      .command(QronosConsoleCommand)
      .command(CloudCommand)
      .command(RollCallCommand)
      .command(ProfileCommand)
      .command(AutoCommand)
      .command(RemoteCommand)
      .command(DaemonCommand)
      .command(ConfigCLICommand)
      .command(WorktreeCommand)
    if (process.env.QRONOS_PTY_SMOKE === "1") cli.command(PtySmokeCommand)
    if (InstallationBuildKind !== "release") cli.command(DevSetupCommand).command(DevAliasCommand)
    // Safe self-reference: `cli` is a typed parameter and yargs `.command()` returns the same
    // instance, so the help command can resolve the fully-built root at handler time. This also
    // sidesteps the self-referential type error the old inline registration hit in index.ts.
    cli.command(createHelpCommand(() => cli))
    return cli
  }

  export async function runner() {
    if (!process.argv.includes("__background-process-runner")) return false
    return (await import("@/qronos/background-process/runner")).BackgroundProcessRunner.maybe()
  }

  // Runs from the upstream `.middleware`, before any command handler. Env tagging is additive so
  // it never has to modify upstream's own env assignments.
  export async function bootstrap(opts: { [key: string]: unknown }): Promise<void> {
    info = opts.help === true || opts.version === true
    if (info) return
    narrow = workerTui(opts)

    const { QronosLog } = await import("@/qronos/log")
    await QronosLog.init()

    const gateway = await import("@qronos-ai/gateway")
    if (!process.env[gateway.ENV_FEATURE])
      process.env[gateway.ENV_FEATURE] = process.argv.includes("serve") ? "unknown" : "cli"
    if (!process.env[gateway.ENV_VERSION]) process.env[gateway.ENV_VERSION] = InstallationVersion
    process.env.QRONOS = "1"

    // Must run before AppRuntime initializes the SQLite database, or the marker
    // exists before legacy JSON can be imported.
    const { JsonMigration } = await import("@/qronos/storage/json-migration")
    await JsonMigration.bootstrap()

    const runtime = narrow ? await import("@/qronos/cli/bootstrap-runtime") : undefined
    const app = narrow ? undefined : await import("@/effect/app-runtime")
    const cfg = runtime
      ? await runtime.QronosCliBootstrapRuntime.getGlobal()
      : await app!.AppRuntime.runPromise((await import("@/config/config")).Config.Service.use((c) => c.getGlobal()))

    const { Global } = await import("@qronos-ai/core/global")
    const { Telemetry } = await import("@qronos-ai/telemetry")
    await Telemetry.init({
      dataPath: Global.Path.data,
      version: InstallationVersion,
      enabled: cfg.experimental?.openTelemetry !== false,
    })

    const { migrateLegacyQronosAuth } = gateway
    const getAuth = async () => {
      if (runtime) return runtime.QronosCliBootstrapRuntime.getAuth()
      const { Auth } = await import("@/auth")
      return app!.AppRuntime.runPromise(Auth.Service.use((s) => s.get("qronos")))
    }
    const setAuth = async (auth: Auth.Info) => {
      if (runtime) return runtime.QronosCliBootstrapRuntime.setAuth(auth)
      const { Auth } = await import("@/auth")
      return app!.AppRuntime.runPromise(Auth.Service.use((s) => s.set("qronos", auth)))
    }

    // Migrate legacy Qronos CLI auth (~/.qronos/cli/config.json) into auth.json if present.
    await migrateLegacyQronosAuth(
      async () => (await getAuth()) !== undefined,
      setAuth,
    )

    const auth = await getAuth()
    if (auth) {
      const token = auth.type === "oauth" ? auth.access : auth.key
      const account = auth.type === "oauth" ? auth.accountId : undefined
      await Telemetry.updateIdentity(token, account)
    }

    Telemetry.trackCliStart()
    // Overlap the event upload with command execution so exit is not delayed by
    // a network round trip (#10242).
    Telemetry.flushInBackground()
  }

  // Runs from the `finally` block on every exit path.
  export async function shutdown(): Promise<void> {
    if (info) return
    const { Telemetry } = await import("@qronos-ai/telemetry")
    const code = typeof process.exitCode === "number" ? process.exitCode : undefined
    Telemetry.trackCliExit(code)
    const { SessionExport } = await import("@/qronos/session-export")
    try {
      await SessionExport.shutdown()
      // Bound telemetry shutdown so an unreachable endpoint (offline, firewall,
      // DNS adblock resolving the host to 0.0.0.0) cannot block process exit on
      // short-lived commands like `qronos --help` / `qronos --version` (#9788).
      try {
        await Telemetry.shutdown(2000)
      } catch (err) {
        log.warn("telemetry shutdown failed", { err })
      }
    } finally {
      await QronosShutdown.run()
      if (narrow) {
        const { QronosCliBootstrapRuntime } = await import("@/qronos/cli/bootstrap-runtime")
        await QronosCliBootstrapRuntime.dispose()
        return
      }
      const { InstanceRuntime } = await import("@/project/instance-runtime")
      await InstanceRuntime.disposeAllInstances() // safety net (no-op if already disposed)
    }
  }
}

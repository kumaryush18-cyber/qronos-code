import yargs from "yargs"
import { hideBin } from "yargs/helpers"
// qronos_change - upstream account console intentionally omitted; QronosCli registers `qronos console` for local settings
import { UI } from "./cli/ui"
import { TuiThreadCommand } from "./cli/cmd/tui" // qronos_change - yargs requires the default command builder eagerly
import { InstallationVersion } from "@qronos-ai/core/installation/version"
import { FormatError } from "./cli/error"
import { EOL } from "os"
// qronos_change - upstream web command intentionally omitted; Qronos does not ship an embedded web UI
import { errorMessage } from "./util/error"
import { Heap } from "./cli/heap"
import { QronosCli } from "@/qronos/cli/setup" // qronos_change
import * as Log from "@qronos-ai/core/util/log" // qronos_change
import { ensureProcessMetadata } from "@qronos-ai/core/util/opencode-process" // qronos_change
// qronos_change start - defer heavy command implementations until yargs selects them
import {
  AcpCommand,
  AgentCommand,
  AttachCommand,
  DbCommand,
  DebugCommand,
  ExportCommand,
  GenerateCommand,
  GithubCommand,
  ImportCommand,
  McpCommand,
  ModelsCommand,
  PluginCommand,
  PrCommand,
  ProvidersCommand,
  RunCommand,
  ServeCommand,
  SessionCommand,
  StatsCommand,
  UninstallCommand,
  UpgradeCommand,
  waitForLazyCommands,
} from "@/qronos/cli/lazy-commands"
// qronos_change end

const args = hideBin(process.argv)
const metadata = ensureProcessMetadata("main") // qronos_change - correlate logs across the CLI and TUI worker

if (await QronosCli.runner()) process.exit() // qronos_change - run persistent process guardians before CLI bootstrap

function show(out: string) {
  const text = out.trimStart()
  if (!text.startsWith("opencode ")) {
    process.stderr.write(UI.logo() + EOL + EOL)
    process.stderr.write(text + EOL)
    return
  }
  process.stderr.write(out)
}

let cli = yargs(args) // qronos_change
  .parserConfiguration({ "populate--": true })
  .scriptName("qronos") // qronos_change
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware(async (opts) => {
    if (opts.printLogs) process.env.QRONOS_PRINT_LOGS = "1"
    if (opts.logLevel) process.env.QRONOS_LOG_LEVEL = opts.logLevel
    if (opts.pure) {
      process.env.QRONOS_PURE = "1"
    }

    Heap.start()

    process.env.AGENT = "1"
    process.env.OPENCODE = "1"
    process.env.QRONOS_PID = String(process.pid)
    await QronosCli.bootstrap(opts) // qronos_change - env tagging, telemetry init, legacy JSON-to-SQLite migration, and auth migration
    // qronos_change start - retain Qronos process/run correlation metadata in startup logs
    Log.Default.info("opencode", {
      version: InstallationVersion,
      command: args[0] ?? "", // avoid persisting prompts, passwords, tokens, headers, or environment values
      process_role: metadata.processRole,
      run_id: metadata.runID,
    })
    // qronos_change end
  })
  .usage("")
  .completion("completion", "generate shell completion script")
  .command(AcpCommand)
  .command(McpCommand)
  .command(TuiThreadCommand)
  .command(AttachCommand)
  .command(RunCommand)
  .command(GenerateCommand)
  .command(DebugCommand)
  // qronos_change - upstream account console intentionally not registered; QronosConsole is added by QronosCli.register
  .command(ProvidersCommand)
  .command(AgentCommand)
  .command(UpgradeCommand)
  .command(UninstallCommand)
  .command(ServeCommand)
  // qronos_change - upstream web command intentionally omitted
  .command(ModelsCommand)
  .command(StatsCommand)
  .command(ExportCommand)
  .command(ImportCommand)
  .command(GithubCommand)
  .command(PrCommand)
  .command(SessionCommand)
  .command(PluginCommand)
  .command(DbCommand)

// qronos_change start - register Qronos-specific commands after the upstream chain
cli = QronosCli.register(cli)
await waitForLazyCommands() // qronos_change - yargs completion invokes builders synchronously
cli = cli
  // qronos_change end
  .fail((msg, err) => {
    if (
      msg?.startsWith("Unknown argument") ||
      msg?.startsWith("Not enough non-option arguments") ||
      msg?.startsWith("Invalid values:")
    ) {
      if (err) throw err
      cli.showHelp(show)
    }
    if (err) throw err
    process.exit(1)
  })
  .strict()

try {
  if (args.includes("-h") || args.includes("--help")) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
} catch (e) {
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error" + EOL)
    process.stderr.write(errorMessage(e) + EOL)
  }
  process.exitCode = 1
} finally {
  await QronosCli.shutdown() // qronos_change - telemetry/session-export shutdown + instance disposal

  // Some subprocesses don't react properly to SIGTERM and similar signals.
  // Most notably, some docker-container-based MCP servers don't handle such signals unless
  // run using `docker run --init`.
  // Explicitly exit to avoid any hanging subprocesses.
  process.exit()
}

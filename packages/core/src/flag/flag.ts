import { Config } from "effect"
import { InstallationChannel } from "../installation/version" // qronos_change

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

// qronos_change start
function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

const UNSTABLE_CHANNELS = new Set(["dev", "beta", "local"])
function unstableDefault(key: string) {
  return truthy(key) || (!falsy(key) && UNSTABLE_CHANNELS.has(InstallationChannel))
}

function number(key: string) {
  const value = process.env[key]
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

const QRONOS_EXPERIMENTAL = truthy("QRONOS_EXPERIMENTAL")
const QRONOS_DISABLE_CLAUDE_CODE = truthy("QRONOS_DISABLE_CLAUDE_CODE")
const QRONOS_DISABLE_CLAUDE_CODE_SKILLS = QRONOS_DISABLE_CLAUDE_CODE || truthy("QRONOS_DISABLE_CLAUDE_CODE_SKILLS")
// qronos_change end
const copy = process.env["QRONOS_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["QRONOS_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("QRONOS_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  QRONOS_AUTO_SHARE: truthy("QRONOS_AUTO_SHARE"), // qronos_change
  QRONOS_AUTO_HEAP_SNAPSHOT: truthy("QRONOS_AUTO_HEAP_SNAPSHOT"),
  QRONOS_GIT_BASH_PATH: process.env["QRONOS_GIT_BASH_PATH"],
  QRONOS_CONFIG: process.env["QRONOS_CONFIG"],
  QRONOS_CONFIG_CONTENT: process.env["QRONOS_CONFIG_CONTENT"],
  QRONOS_DISABLE_AUTOUPDATE: truthy("QRONOS_DISABLE_AUTOUPDATE"),
  QRONOS_ALWAYS_NOTIFY_UPDATE: truthy("QRONOS_ALWAYS_NOTIFY_UPDATE"),
  QRONOS_DISABLE_PRUNE: truthy("QRONOS_DISABLE_PRUNE"),
  QRONOS_DISABLE_TERMINAL_TITLE: truthy("QRONOS_DISABLE_TERMINAL_TITLE"),
  QRONOS_SHOW_TTFD: truthy("QRONOS_SHOW_TTFD"),
  // qronos_change start
  QRONOS_DISABLE_DEFAULT_PLUGINS: truthy("QRONOS_DISABLE_DEFAULT_PLUGINS"),
  QRONOS_DISABLE_LSP_DOWNLOAD: truthy("QRONOS_DISABLE_LSP_DOWNLOAD"),
  QRONOS_ENABLE_EXPERIMENTAL_MODELS: truthy("QRONOS_ENABLE_EXPERIMENTAL_MODELS"),
  // qronos_change end
  QRONOS_DISABLE_AUTOCOMPACT: truthy("QRONOS_DISABLE_AUTOCOMPACT"),
  QRONOS_DISABLE_MODELS_FETCH: truthy("QRONOS_DISABLE_MODELS_FETCH"),
  QRONOS_DISABLE_MOUSE: truthy("QRONOS_DISABLE_MOUSE"),
  // qronos_change start
  QRONOS_DISABLE_CLAUDE_CODE,
  QRONOS_DISABLE_CLAUDE_CODE_PROMPT: QRONOS_DISABLE_CLAUDE_CODE || truthy("QRONOS_DISABLE_CLAUDE_CODE_PROMPT"),
  QRONOS_DISABLE_CLAUDE_CODE_SKILLS,
  QRONOS_DISABLE_EXTERNAL_SKILLS: truthy("QRONOS_DISABLE_EXTERNAL_SKILLS"),
  QRONOS_EXPERIMENTAL_CUSTOMIZE_SKILL: unstableDefault("QRONOS_EXPERIMENTAL_CUSTOMIZE_SKILL"),
  // qronos_change end
  QRONOS_FAKE_VCS: process.env["QRONOS_FAKE_VCS"],
  QRONOS_SERVER_PASSWORD: process.env["QRONOS_SERVER_PASSWORD"],
  QRONOS_SERVER_USERNAME: process.env["QRONOS_SERVER_USERNAME"],
  QRONOS_ENABLE_QUESTION_TOOL: truthy("QRONOS_ENABLE_QUESTION_TOOL"), // qronos_change

  QRONOS_EXPERIMENTAL, // qronos_change

  QRONOS_EXPERIMENTAL_CLAUDE_MIGRATION: truthy("QRONOS_EXPERIMENTAL_CLAUDE_MIGRATION"), // qronos_change

  QRONOS_EXPERIMENTAL_FILEWATCHER: Config.boolean("QRONOS_EXPERIMENTAL_FILEWATCHER").pipe(Config.withDefault(false)), // qronos_change

  QRONOS_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("QRONOS_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),

  QRONOS_EXPERIMENTAL_ICON_DISCOVERY: QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_ICON_DISCOVERY"), // qronos_change

  QRONOS_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("QRONOS_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),

  QRONOS_ENABLE_EXA: truthy("QRONOS_ENABLE_EXA") || QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_EXA"), // qronos_change

  QRONOS_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS: number("QRONOS_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"), // qronos_change

  QRONOS_EXPERIMENTAL_OUTPUT_TOKEN_MAX: number("QRONOS_EXPERIMENTAL_OUTPUT_TOKEN_MAX"), // qronos_change

  QRONOS_EXPERIMENTAL_OXFMT: QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_OXFMT"), // qronos_change

  QRONOS_EXPERIMENTAL_LSP_TY: truthy("QRONOS_EXPERIMENTAL_LSP_TY"), // qronos_change

  QRONOS_EXPERIMENTAL_LSP_TOOL: QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_LSP_TOOL"), // qronos_change

  QRONOS_EXPERIMENTAL_SCOUT: QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_SCOUT"), // qronos_change

  QRONOS_EXPERIMENTAL_MARKDOWN: !falsy("QRONOS_EXPERIMENTAL_MARKDOWN"), // qronos_change

  QRONOS_ENABLE_PARALLEL: truthy("QRONOS_ENABLE_PARALLEL") || truthy("QRONOS_EXPERIMENTAL_PARALLEL"), // qronos_change

  QRONOS_MODELS_URL: process.env["QRONOS_MODELS_URL"],

  QRONOS_MODELS_PATH: process.env["QRONOS_MODELS_PATH"],

  QRONOS_DISABLE_EMBEDDED_WEB_UI: truthy("QRONOS_DISABLE_EMBEDDED_WEB_UI"), // qronos_change

  QRONOS_DB: process.env["QRONOS_DB"],

  QRONOS_DISABLE_CHANNEL_DB: truthy("QRONOS_DISABLE_CHANNEL_DB"), // qronos_change

  QRONOS_SKIP_MIGRATIONS: truthy("QRONOS_SKIP_MIGRATIONS"), // qronos_change

  QRONOS_STRICT_CONFIG_DEPS: truthy("QRONOS_STRICT_CONFIG_DEPS"), // qronos_change

  QRONOS_WORKSPACE_ID: process.env["QRONOS_WORKSPACE_ID"],

  QRONOS_EXPERIMENTAL_WORKSPACES: enabledByExperimental("QRONOS_EXPERIMENTAL_WORKSPACES"),

  QRONOS_EXPERIMENTAL_EVENT_SYSTEM: QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_EVENT_SYSTEM"), // qronos_change

  QRONOS_EXPERIMENTAL_SESSION_SWITCHING: QRONOS_EXPERIMENTAL || truthy("QRONOS_EXPERIMENTAL_SESSION_SWITCHING"), // qronos_change

  QRONOS_EXPERIMENTAL_SESSION_SWITCHER: enabledByExperimental("QRONOS_EXPERIMENTAL_SESSION_SWITCHER"), // qronos_change

  QRONOS_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("QRONOS_DISABLE_FFF"), // qronos_change

  get QRONOS_DISABLE_PROJECT_CONFIG() {
    return truthy("QRONOS_DISABLE_PROJECT_CONFIG")
  },
  get QRONOS_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("QRONOS_EXPERIMENTAL_REFERENCES")
  },
  get QRONOS_TUI_CONFIG() {
    return process.env["QRONOS_TUI_CONFIG"]
  },
  get QRONOS_CONFIG_DIR() {
    return process.env["QRONOS_CONFIG_DIR"]
  },
  get QRONOS_PURE() {
    return truthy("QRONOS_PURE")
  },
  get QRONOS_PERMISSION() {
    return process.env["QRONOS_PERMISSION"]
  },
  get QRONOS_PLUGIN_META_FILE() {
    return process.env["QRONOS_PLUGIN_META_FILE"]
  },
  get QRONOS_CLIENT() {
    return process.env["QRONOS_CLIENT"] ?? "cli"
  },
  // qronos_change start
  get QRONOS_SESSION_RETRY_LIMIT() {
    return number("QRONOS_SESSION_RETRY_LIMIT")
  },
  // qronos_change end
}

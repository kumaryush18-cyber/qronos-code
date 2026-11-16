import { Config, ConfigProvider, Context, Effect, Layer, Option } from "effect"
import { ConfigService } from "@/effect/config-service"

const bool = (name: string) => Config.boolean(name).pipe(Config.withDefault(false))
const positiveInteger = (name: string) =>
  Config.number(name).pipe(
    Config.map((value) => (Number.isInteger(value) && value > 0 ? value : undefined)),
    Config.orElse(() => Config.succeed(undefined)),
  )
const experimental = bool("QRONOS_EXPERIMENTAL")
const enabledByExperimental = (name: string) =>
  Config.all({ experimental, enabled: Config.boolean(name).pipe(Config.option) }).pipe(
    Config.map((flags) => Option.getOrElse(flags.enabled, () => flags.experimental)),
  )

export class Service extends ConfigService.Service<Service>()("@opencode/RuntimeFlags", {
  autoShare: bool("QRONOS_AUTO_SHARE"),
  pure: bool("QRONOS_PURE"),
  disableDefaultPlugins: bool("QRONOS_DISABLE_DEFAULT_PLUGINS"),
  disableChannelDb: bool("QRONOS_DISABLE_CHANNEL_DB"), // qronos_change
  disableEmbeddedWebUi: bool("QRONOS_DISABLE_EMBEDDED_WEB_UI"),
  disableExternalSkills: bool("QRONOS_DISABLE_EXTERNAL_SKILLS"),
  disableSkillShell: bool("QRONOS_DISABLE_SKILL_SHELL"), // qronos_change - disable shell injection in skill bodies
  disableLspDownload: bool("QRONOS_DISABLE_LSP_DOWNLOAD"),
  skipMigrations: bool("QRONOS_SKIP_MIGRATIONS"), // qronos_change
  disableClaudeCodePrompt: Config.all({
    broad: bool("QRONOS_DISABLE_CLAUDE_CODE"),
    direct: bool("QRONOS_DISABLE_CLAUDE_CODE_PROMPT"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  disableClaudeCodeSkills: Config.all({
    broad: bool("QRONOS_DISABLE_CLAUDE_CODE"),
    direct: bool("QRONOS_DISABLE_CLAUDE_CODE_SKILLS"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  enableExa: Config.all({
    experimental,
    enabled: bool("QRONOS_ENABLE_EXA"),
    legacy: bool("QRONOS_EXPERIMENTAL_EXA"),
  }).pipe(Config.map((flags) => flags.experimental || flags.enabled || flags.legacy)),
  enableParallel: Config.all({
    enabled: bool("QRONOS_ENABLE_PARALLEL"),
    legacy: bool("QRONOS_EXPERIMENTAL_PARALLEL"),
  }).pipe(Config.map((flags) => flags.enabled || flags.legacy)),
  enableExperimentalModels: bool("QRONOS_ENABLE_EXPERIMENTAL_MODELS"),
  enableQuestionTool: bool("QRONOS_ENABLE_QUESTION_TOOL"),
  experimentalScout: enabledByExperimental("QRONOS_EXPERIMENTAL_SCOUT"), // qronos_change
  experimentalReferences: enabledByExperimental("QRONOS_EXPERIMENTAL_REFERENCES"),
  // qronos_change start - enabled by default, with an opt-out kill switch
  experimentalBackgroundSubagents: Config.boolean("QRONOS_EXPERIMENTAL_BACKGROUND_SUBAGENTS").pipe(
    Config.withDefault(true),
  ),
  // qronos_change end
  experimentalLspTy: bool("QRONOS_EXPERIMENTAL_LSP_TY"),
  experimentalLspTool: enabledByExperimental("QRONOS_EXPERIMENTAL_LSP_TOOL"),
  // qronos_change start - self-context tools
  experimentalContextTools: enabledByExperimental("QRONOS_EXPERIMENTAL_CONTEXT_TOOLS"),
  // qronos_change end
  experimentalOxfmt: enabledByExperimental("QRONOS_EXPERIMENTAL_OXFMT"),
  experimentalCodeMode: enabledByExperimental("QRONOS_EXPERIMENTAL_CODE_MODE"),
  experimentalEventSystem: enabledByExperimental("QRONOS_EXPERIMENTAL_EVENT_SYSTEM"),
  experimentalSessionSwitcher: enabledByExperimental("QRONOS_EXPERIMENTAL_SESSION_SWITCHER"), // qronos_change
  // qronos_change start - enabled by default, with an opt-out kill switch
  experimentalSharedAgentBoard: Config.boolean("QRONOS_EXPERIMENTAL_SHARED_AGENT_BOARD").pipe(Config.withDefault(true)),
  // qronos_change end
  experimentalWorkspaces: enabledByExperimental("QRONOS_EXPERIMENTAL_WORKSPACES"),
  experimentalIconDiscovery: enabledByExperimental("QRONOS_EXPERIMENTAL_ICON_DISCOVERY"),
  experimentalMcpApps: enabledByExperimental("QRONOS_EXPERIMENTAL_MCP_APPS"), // qronos_change
  outputTokenMax: positiveInteger("QRONOS_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  bashDefaultTimeoutMs: positiveInteger("QRONOS_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  experimentalNativeLlm: bool("QRONOS_EXPERIMENTAL_NATIVE_LLM"),
  experimentalWebSockets: bool("QRONOS_EXPERIMENTAL_WEBSOCKETS"),
  client: Config.string("QRONOS_CLIENT").pipe(Config.withDefault("cli")),
}) {}

export type Info = Context.Service.Shape<typeof Service>

const emptyConfigLayer = Service.layer.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
  Layer.orDie,
)

export const layer = (overrides: Partial<Info> = {}) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const flags = yield* Service
      return Service.of({ ...flags, ...overrides })
    }),
  ).pipe(Layer.provide(emptyConfigLayer))

export const node = LayerNode.make({ service: Service, layer: Service.layer.pipe(Layer.orDie), deps: [] })

export * as RuntimeFlags from "./runtime-flags"
import { LayerNode } from "@qronos-ai/core/effect/layer-node"

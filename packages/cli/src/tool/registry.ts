import { LayerNode } from "@qronos-ai/core/effect/layer-node"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder" // qronos_change
import { Ripgrep } from "@qronos-ai/core/ripgrep"
import { PlanExitTool } from "./plan"
import { Session } from "@/session/session"
import { SessionCompaction } from "@/session/compaction" // qronos_change - compaction service for the experimental compact tool
import { QuestionTool } from "./question"
// qronos_change start
import { SuggestTool } from "../qronos/suggestion/tool"
import { Command } from "@/command"
// qronos_change end
import { ShellTool } from "./shell"
import { EditTool } from "./edit"
import { GlobTool } from "./glob"
import { GrepTool } from "./grep"
import { ReadTool } from "./read"
import { TaskTool } from "./task"
import { Database } from "@qronos-ai/core/database/database"
import { TodoWriteTool } from "./todo"
import { WebFetchTool } from "./webfetch"
import { WriteTool } from "./write"
import { InvalidTool } from "./invalid"
import { SkillTool } from "./skill"
import * as Tool from "./tool"
import { Config } from "@/config/config"
import { type ToolContext as PluginToolContext, type ToolDefinition } from "@qronos-ai/plugin"
import type { JSONSchema7, JSONSchema7Definition } from "@ai-sdk/provider"
import { Schema } from "effect"
import z from "zod"
import { Plugin } from "../plugin"
import { Provider } from "@/provider/provider"

import { WebSearchTool } from "./websearch"
import { QronosToolRegistry } from "../qronos/tool/registry" // qronos_change
import { QronosCodeMode } from "../qronos/tool/code-mode" // qronos_change
import { Notebook } from "@/qronos/notebook/service" // qronos_change
import { AgentManager } from "@/qronos/agent-manager/service" // qronos_change
import { Wakeup } from "@/qronos/wakeup" // qronos_change
import { SessionDrain } from "@/qronos/session/drain" // qronos_change
import { RepoOverviewTool } from "@/qronos/tool/repo-overview" // qronos_change
import { ContextInfoTool, CompactTool } from "@/qronos/tool/context" // qronos_change
import { RepoCloneTool } from "./repo_clone" // qronos_change
import { Flag } from "@qronos-ai/core/flag/flag" // qronos_change
import { stripZodFormat } from "@qronos-ai/core/qronos/json-schema-format" // qronos_change
import { Auth } from "@/auth" // qronos_change
import { Env } from "@/env" // qronos_change - websearch resolves its config via Env.Service
import { LspTool } from "./lsp"
import * as Truncate from "./truncate"
import { ApplyPatchTool } from "./apply_patch"
import { Glob } from "@qronos-ai/core/util/glob"
import path from "path"
import { pathToFileURL } from "url"
import { Effect, Layer, Context, Option, Result } from "effect" // qronos_change
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { HttpClient } from "effect/unstable/http" // qronos_change
import { CrossSpawnSpawner } from "@qronos-ai/core/cross-spawn-spawner"
import { Format } from "../format"
import { InstanceState } from "@/effect/instance-state"
import { EffectBridge } from "@/effect/bridge"
import { Question } from "../question"
import { Todo } from "../session/todo"
import { LSP } from "@/lsp/lsp"
import { Instruction } from "../session/instruction"
import { FSUtil } from "@qronos-ai/core/fs-util"
import { EventV2Bridge } from "@/event-v2-bridge"
import { Bus } from "../bus"
import { Agent } from "../agent/agent"
import { Skill } from "../skill"
import { Permission } from "@/permission"
import { SessionStatus } from "@/session/status" // qronos_change
import { QronosSessions } from "@/qronos-sessions/qronos-sessions" // qronos_change - provide QronosSessions.Service so the notify_user tool's init resolves
import { Git } from "@/git" // qronos_change
import { BackgroundJob } from "@/background/job"
import { RuntimeFlags } from "@/effect/runtime-flags"
import * as ToolNetwork from "@/qronos/sandbox/network" // qronos_change
import { MemoryService } from "@qronos-ai/memory/effect/service" // qronos_change
import { ProviderV2 } from "@qronos-ai/core/provider"
import { ModelV2 } from "@qronos-ai/core/model"
import { RepositoryCache } from "@qronos-ai/core/repository-cache" // qronos_change
import { RipgrepBinary } from "@qronos-ai/core/ripgrep/binary" // qronos_change
import { AppProcess } from "@qronos-ai/core/process" // qronos_change
import { MCP } from "@/mcp"
import { PermissionV1 } from "@qronos-ai/core/v1/permission"
import { McpCatalog } from "@/mcp/catalog"
import { InstanceRef } from "@/effect/instance-ref" // qronos_change

export function webSearchEnabled(
  providerID: ProviderV2.ID,
  flags = { exa: Flag.QRONOS_ENABLE_EXA, parallel: Flag.QRONOS_ENABLE_PARALLEL },
) {
  return (
    providerID === ProviderV2.ID.qronos || // qronos_change
    providerID === ProviderV2.ID.make("opencode-go") ||
    flags.exa ||
    flags.parallel
  )
}

type TaskDef = Tool.InferDef<typeof TaskTool>
type ReadDef = Tool.InferDef<typeof ReadTool>

type State = {
  custom: Tool.Def[]
  builtin: Tool.Def[]
  task: TaskDef
  read: ReadDef
}

export interface Interface {
  readonly ids: () => Effect.Effect<string[]>
  readonly all: () => Effect.Effect<Tool.Def[]>
  readonly named: () => Effect.Effect<{ task: TaskDef; read: ReadDef }>
  // qronos_change start
  readonly tools: (model: {
    providerID: ProviderV2.ID
    modelID: ModelV2.ID
    family?: string
    agent: Agent.Info
    permission?: PermissionV1.Ruleset
    networkRestricted?: boolean // qronos_change - hide network-backed code-mode catalogs in restricted sessions
  }) => Effect.Effect<Tool.Def[]>
  // qronos_change end
}

export class Service extends Context.Service<Service, Interface>()("@opencode/ToolRegistry") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const config = yield* Config.Service
    const plugin = yield* Plugin.Service
    const agents = yield* Agent.Service
    const truncate = yield* Truncate.Service
    const flags = yield* RuntimeFlags.Service
    const mcp = yield* MCP.Service
    const sessions = yield* Session.Service

    const invalid = yield* InvalidTool
    const task = yield* TaskTool
    const read = yield* ReadTool
    const question = yield* QuestionTool
    const todo = yield* TodoWriteTool
    const lsptool = yield* LspTool
    const plan = yield* PlanExitTool
    const webfetch = yield* WebFetchTool
    const websearch = yield* WebSearchTool
    const clone = yield* RepoCloneTool // qronos_change
    const overview = yield* RepoOverviewTool // qronos_change
    // qronos_change start - self-context tools
    const contextInfoTool = yield* ContextInfoTool
    const compactTool = yield* CompactTool
    // qronos_change end
    const shell = yield* ShellTool
    const globtool = yield* GlobTool
    const writetool = yield* WriteTool
    const edit = yield* EditTool
    const greptool = yield* GrepTool
    const patchtool = yield* ApplyPatchTool
    const skilltool = yield* SkillTool
    const agent = yield* Agent.Service
    // qronos_change start
    const suggesttool = yield* SuggestTool
    const manager = Option.getOrUndefined(yield* Effect.serviceOption(AgentManager.Service))
    const notebook = Option.getOrUndefined(yield* Effect.serviceOption(Notebook.Service))
    const qronosToolInfos = yield* QronosToolRegistry.infos(manager, notebook).pipe(Effect.provide(MemoryService.layer))
    // qronos_change end
    const codeMode = flags.experimentalCodeMode ? yield* Effect.promise(() => import("./code-mode")) : undefined

    const state = yield* InstanceState.make<State>(
      Effect.fn("ToolRegistry.state")(function* (ctx) {
        // qronos_change start - Code Mode can also be enabled from the Qronos config toggle
        const qronosCfg = yield* config.get()
        const mode = codeMode ?? (yield* Effect.promise(() => QronosCodeMode.load(flags, qronosCfg)))
        const codeModeTool = mode
          ? yield* mode.CodeModeTool.pipe(
              // qronos_change end
              Effect.provideService(MCP.Service, mcp),
              Effect.provideService(Agent.Service, agents),
              Effect.provideService(Session.Service, sessions),
              Effect.provideService(Plugin.Service, plugin),
              Effect.provideService(Truncate.Service, truncate),
              Effect.provideService(InstanceRef, ctx),
            )
          : undefined // qronos_change - initialize code mode with the active instance context
        const custom: Tool.Def[] = []

        function fromPlugin(id: string, def: ToolDefinition): Tool.Def {
          // Plugin tools still expose Zod args publicly; keep that compatibility
          // boxed at the registry boundary and give the LLM the original JSON Schema.
          // Normalize missing args to `{}` once — pre-1.14.49 the code was
          // `z.object(def.args)` and Zod silently tolerated undefined (#27451, #27630).
          const args = def.args ?? {}
          const entries = Object.entries(args)
          const allZod = entries.every((entry) => isZodType(entry[1]))
          const zodParams = allZod ? z.object(args) : undefined
          const jsonSchema = zodParams ? zodJsonSchema(zodParams) : legacyJsonSchema(entries)
          const parameters = zodParams
            ? Schema.declare<unknown>((u): u is unknown => zodParams.safeParse(u).success)
            : Schema.Unknown
          return {
            id,
            parameters,
            jsonSchema,
            description: def.description,
            execute: (args, toolCtx) =>
              Effect.gen(function* () {
                // Bridge the host's Effect-based `ask` into a Promise-returning
                // function for the plugin to make sure context persists
                const bridge = yield* EffectBridge.make()
                const pluginCtx: PluginToolContext = {
                  ...toolCtx,
                  ask: (req) => bridge.promise(toolCtx.ask(req)),
                  directory: ctx.directory,
                  worktree: ctx.worktree,
                }
                const result = yield* Effect.promise(() => def.execute(args as any, pluginCtx))
                const output = typeof result === "string" ? result : result.output
                const metadata = typeof result === "string" ? {} : (result.metadata ?? {})
                const attachments = typeof result === "string" ? undefined : result.attachments
                const info = yield* agent.get(toolCtx.agent)
                const out = yield* truncate.output(output, {}, info)
                return {
                  title: typeof result === "string" ? "" : (result.title ?? ""),
                  output: out.truncated ? out.content : output,
                  attachments,
                  metadata: {
                    ...metadata,
                    truncated: out.truncated,
                    ...(out.truncated && { outputPath: out.outputPath }),
                  },
                }
              }).pipe(
                Effect.withSpan("Tool.execute", {
                  attributes: {
                    "tool.name": id,
                    "session.id": toolCtx.sessionID,
                    "message.id": toolCtx.messageID,
                    ...(toolCtx.callID ? { "tool.call_id": toolCtx.callID } : {}),
                  },
                }),
              ),
          }
        }

        // qronos_change start - a plugin tool whose args Zod cannot convert to JSON Schema must not
        // abort the whole registry: `zodJsonSchema` throws for `z.custom`, `z.instanceof`, `z.symbol`,
        // BigInt defaults and duplicate `meta({ id })`, and the throw used to escape the state
        // constructor so the session received no tools at all.
        const register = Effect.fn("ToolRegistry.registerPlugin")(function* (id: string, def: ToolDefinition) {
          const result = Result.try({
            try: () => fromPlugin(id, def),
            catch: (error) => error,
          })
          if (Result.isFailure(result)) {
            yield* Effect.logError("skipping plugin tool with unconvertible schema", {
              tool: id,
              error: result.failure instanceof Error ? result.failure.message : String(result.failure),
            })
            return
          }
          custom.push(result.success)
        })
        // qronos_change end

        const dirs = yield* config.directories()
        const matches = dirs.flatMap((dir) =>
          Glob.scanSync("{tool,tools}/*.{js,ts}", { cwd: dir, absolute: true, dot: true, symlink: true }),
        )
        if (matches.length) yield* config.waitForDependencies()
        for (const match of matches) {
          const namespace = path.basename(match, path.extname(match))
          // `match` is an absolute filesystem path from `Glob.scanSync(..., { absolute: true })`.
          // Import it as `file://` so Node on Windows accepts the dynamic import.
          const mod = yield* Effect.promise(() => import(pathToFileURL(match).href))
          for (const [id, def] of Object.entries(mod)) {
            if (!isPluginTool(def)) continue
            yield* register(id === "default" ? namespace : `${namespace}_${id}`, def) // qronos_change
          }
        }

        const plugins = yield* plugin.list()
        for (const p of plugins) {
          for (const [id, def] of Object.entries(p.tool ?? {})) {
            yield* register(id, def) // qronos_change
          }
        }

        // qronos_change start
        const cfg = qronosCfg
        const global = yield* config.getGlobal()
        const indexing = QronosToolRegistry.indexing(cfg, global)
        // qronos_change end
        const questionEnabled = ["app", "cli", "desktop", "vscode"].includes(flags.client) || flags.enableQuestionTool // qronos_change: add vscode client

        const tool = yield* Effect.all({
          invalid: Tool.init(invalid),
          shell: Tool.init(shell),
          read: Tool.init(read),
          glob: Tool.init(globtool),
          grep: Tool.init(greptool),
          edit: Tool.init(edit),
          write: Tool.init(writetool),
          task: Tool.init(task),
          fetch: Tool.init(webfetch),
          todo: Tool.init(todo),
          search: Tool.init(websearch),
          clone: Tool.init(clone), // qronos_change
          overview: Tool.init(overview), // qronos_change
          skill: Tool.init(skilltool),
          patch: Tool.init(patchtool),
          question: Tool.init(question),
          lsp: Tool.init(lsptool),
          contextInfo: Tool.init(contextInfoTool), // qronos_change
          compact: Tool.init(compactTool), // qronos_change
          plan: Tool.init(plan),
          suggest: Tool.init(suggesttool),
          ...(codeModeTool ? { execute: Tool.init(codeModeTool) } : {}), // qronos_change
        })

        // qronos_change start
        const qronos = yield* QronosToolRegistry.build(qronosToolInfos, {
          agent: agents,
          truncate,
          indexing: indexing ?? false,
        })
        // qronos_change end

        return {
          custom,
          // qronos_change start
          builtin: QronosToolRegistry.describe(
            [
              tool.invalid,
              ...(questionEnabled ? [tool.question] : []),
              tool.shell,
              tool.read,
              tool.glob,
              tool.grep,
              tool.edit,
              tool.write,
              tool.task,
              tool.fetch,
              tool.todo,
              tool.search,
              ...(flags.experimentalScout ? [tool.clone, tool.overview] : []), // qronos_change
              tool.skill,
              tool.patch,
              tool.plan,
              ...(["cli", "vscode"].includes(flags.client) ? [tool.suggest] : []),
              ...QronosToolRegistry.extra(qronos, cfg, flags),
              ...(tool.execute ? [tool.execute] : []),
              ...(flags.experimentalLspTool ? [tool.lsp] : []),
              ...(flags.experimentalContextTools ? [tool.contextInfo, tool.compact] : []), // qronos_change
            ],
            qronos,
          ),
          // qronos_change end
          task: tool.task,
          read: tool.read,
        }
      }),
    )

    const all: Interface["all"] = Effect.fn("ToolRegistry.all")(function* () {
      const s = yield* InstanceState.get(state)
      return [...s.builtin.map(ToolNetwork.builtin), ...s.custom] as Tool.Def[] // qronos_change
    })

    const ids: Interface["ids"] = Effect.fn("ToolRegistry.ids")(function* () {
      return (yield* all()).map((tool) => tool.id)
    })

    const describeTask = Effect.fn("ToolRegistry.describeTask")(function* (agent: Agent.Info) {
      const items = (yield* agents.list()).filter((item) => item.mode !== "primary")
      const filtered = items.filter(
        (item) => Permission.evaluate("task", item.name, agent.permission).action !== "deny",
      )
      const list = filtered.toSorted((a, b) => a.name.localeCompare(b.name))
      const description = list
        .map(
          (item) =>
            `- ${item.name}: ${item.description ?? "This subagent should only be called manually by the user."}`,
        )
        .join("\n")
      return ["Available agent types and the tools they have access to:", description].join("\n")
    })

    const describeCodeMode = Effect.fn("ToolRegistry.describeCodeMode")(function* (
      input: {
        agent: Agent.Info
        permission?: PermissionV1.Ruleset
        networkRestricted?: boolean // qronos_change
      },
      cfg: Config.Info,
    ) {
      // qronos_change - reuse the config already fetched by the caller
      if (input.networkRestricted) return // qronos_change
      // qronos_change start - Code Mode can also be enabled from the Qronos config toggle
      const mode = codeMode ?? (yield* Effect.promise(() => QronosCodeMode.load(flags, cfg)))
      if (!mode) return
      // qronos_change end
      const ruleset = Permission.merge(input.agent.permission, input.permission ?? [])
      const tools = Permission.visibleTools(yield* mcp.tools(), ruleset)
      if (Object.keys(tools).length === 0) return
      // qronos_change start - describe the catalog with the resolved Code Mode module
      return mode.describeCatalog(tools, Object.keys(yield* mcp.clients()).map(McpCatalog.sanitize))
      // qronos_change end
    })

    const tools: Interface["tools"] = Effect.fn("ToolRegistry.tools")(function* (input) {
      const cfg = yield* config.get() // qronos_change
      const filtered = (yield* all()).filter((tool) => {
        if (!QronosToolRegistry.available(tool)) return false // qronos_change
        if (tool.id === WebSearchTool.id) {
          if (cfg.web_search === true) return true // qronos_change
          return webSearchEnabled(input.providerID, { exa: flags.enableExa, parallel: flags.enableParallel })
        }

        const usePatch = QronosToolRegistry.usePatch(input) // qronos_change
        if (tool.id === ApplyPatchTool.id) return usePatch
        if (tool.id === EditTool.id) return !usePatch // qronos_change

        return true
      })
      const qronosFiltered = yield* QronosToolRegistry.applyVisibility(filtered) // qronos_change

      const codeModeDescription = filtered.some((tool) => tool.id === "execute")
        ? yield* describeCodeMode(input, cfg) // qronos_change - pass the config fetched above
        : undefined
      const visible = qronosFiltered.filter((tool) => tool.id !== "execute" || codeModeDescription) // qronos_change

      return yield* Effect.forEach(
        visible,
        Effect.fnUntraced(function* (tool: Tool.Def) {
          const output = {
            description: tool.description,
            parameters: tool.parameters,
            jsonSchema: tool.jsonSchema,
          }
          yield* plugin.trigger("tool.definition", { toolID: tool.id }, output)
          const jsonSchema =
            output.parameters === tool.parameters || output.jsonSchema !== tool.jsonSchema
              ? output.jsonSchema
              : undefined
          // qronos_change start
          const result = {
            id: tool.id,
            description: [
              output.description,
              tool.id === TaskTool.id ? yield* describeTask(input.agent) : undefined,
              tool.id === "execute" ? codeModeDescription : undefined,
            ]
              .filter(Boolean)
              .join("\n"),
            parameters: output.parameters,
            jsonSchema,
            execute: tool.execute,
            formatValidationError: tool.formatValidationError,
          }
          return ToolNetwork.isBuiltin(tool) ? ToolNetwork.builtin(result) : result
          // qronos_change end
        }),
        { concurrency: "unbounded" },
      )
    })

    const named: Interface["named"] = Effect.fn("ToolRegistry.named")(function* () {
      const s = yield* InstanceState.get(state)
      return { task: s.task, read: s.read }
    })

    return Service.of({ ids, all, named, tools })
  }),
)

export const defaultLayer: Layer.Layer<Service> = Layer.suspend(() => AppNodeBuilder.build(node)) // qronos_change - build from the LayerNode graph

function isZodType(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value
}

function isPluginTool(value: unknown): value is ToolDefinition {
  return typeof value === "object" && value !== null && "args" in value && "description" in value && "execute" in value
}

function isJsonSchemaDefinition(value: unknown): value is JSONSchema7Definition {
  return typeof value === "boolean" || (typeof value === "object" && value !== null && !Array.isArray(value))
}

function legacyJsonSchema(entries: [string, unknown][]): JSONSchema7 {
  const properties = Object.fromEntries(
    entries.filter((entry): entry is [string, JSONSchema7Definition] => isJsonSchemaDefinition(entry[1])),
  )
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
  }
}

function zodJsonSchema(schema: z.ZodType): JSONSchema7 {
  // qronos_change start - drop zod 4.6 non-standard string formats
  const result = normalizeZodJsonSchema(
    z.toJSONSchema(schema, { io: "input", metadata: zodMetadataRegistry(schema), override: stripZodFormat }),
  )
  // qronos_change end
  if (!isJsonSchemaObject(result)) throw new Error("plugin tool Zod schema produced a non-object JSON Schema")
  const { $defs, ...rest } = result
  return (
    $defs && isJsonSchemaObject($defs) ? { ...rest, definitions: $defs as JSONSchema7["definitions"] } : rest
  ) as JSONSchema7
}

function zodMetadataRegistry(schema: z.ZodType) {
  const registry = z.registry<Record<string, unknown>>()
  const seen = new WeakSet<object>()
  const collect = (value: unknown) => {
    if (typeof value !== "object" || value === null) return
    if (seen.has(value)) return
    seen.add(value)

    if (isZodType(value)) {
      const metadata = typeof value.meta === "function" ? value.meta() : undefined
      const description = typeof value.description === "string" ? value.description : undefined
      const merged = {
        ...(metadata && typeof metadata === "object" ? metadata : {}),
        ...(description ? { description } : {}),
      }
      if (Object.keys(merged).length) registry.add(value, merged)
      collect(value._zod.def)
      return
    }

    for (const item of Object.values(value)) collect(item)
  }
  collect(schema)
  return registry
}

function normalizeZodJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeZodJsonSchema(item))
  if (typeof value !== "object" || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) =>
        (entry[0] === "exclusiveMaximum" || entry[0] === "exclusiveMinimum") && typeof entry[1] === "boolean"
          ? false
          : true,
      )
      .map(([key, item]) => [key, normalizeZodJsonSchema(item)]),
  )
}

function isJsonSchemaObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// qronos_change start - preserve Qronos registry dependencies and sandbox-aware HTTP in the upstream node graph
const network = LayerNode.make({ service: HttpClient.HttpClient, layer: ToolNetwork.httpLayer, deps: [] })

export const node = LayerNode.suspend(() =>
  LayerNode.make({
    service: Service,
    layer,
    deps: [
      Config.node,
      Plugin.node,
      Question.node,
      Todo.node,
      Agent.node,
      Skill.node,
      Session.node,
      SessionCompaction.node, // qronos_change - compaction service for the experimental compact tool
      BackgroundJob.node,
      SessionDrain.node,
      Provider.node,
      LSP.node,
      Instruction.node,
      FSUtil.node,
      EventV2Bridge.node,
      network,
      CrossSpawnSpawner.node,
      Format.node,
      Truncate.node,
      RuntimeFlags.node,
      MCP.node,
      Database.node,
      Ripgrep.node,
      Command.node,
      Git.node,
      Bus.node,
      Auth.node,
      Env.node, // qronos_change - websearch resolves its config via Env.Service
      SessionStatus.node,
      AgentManager.node,
      Notebook.node,
      RepositoryCache.node,
      QronosSessions.node,
      Wakeup.node, // qronos_change - provides Wakeup.Service to the schedule_wakeup/cancel_wakeup tools
    ],
  }),
)
// qronos_change end

export * as ToolRegistry from "./registry"

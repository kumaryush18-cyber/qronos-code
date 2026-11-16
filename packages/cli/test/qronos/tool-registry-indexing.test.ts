import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder"
import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { Effect, Layer, Schema, Stream } from "effect"
import * as Log from "@qronos-ai/core/util/log"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config/config"
import { QronosIndexing } from "../../src/qronos/indexing"
import { QronosBootstrap } from "../../src/qronos/bootstrap"
import { Wakeup } from "../../src/qronos/wakeup"
import { QronosWatcher } from "../../src/qronos/watcher"
import { QronosSessions } from "../../src/qronos-sessions/qronos-sessions"
import { QronosMemory } from "@qronos-ai/memory/effect"
import { MemoryService } from "@qronos-ai/memory/effect/service"
import { InstanceState } from "../../src/effect/instance-state"
import { QronosToolRegistry } from "../../src/qronos/tool/registry"
import { Provider } from "../../src/provider/provider"
import { ProviderV2 } from "@qronos-ai/core/provider"
import { ModelV2 } from "@qronos-ai/core/model"
import { Session } from "../../src/session/session"
import { SessionSummary } from "../../src/session/summary"
import { ToolRegistry } from "../../src/tool/registry"
import type * as Tool from "../../src/tool/tool"
import { disposeAllInstances, provideTmpdirInstance } from "../fixture/fixture"
import * as CrossSpawnSpawner from "@qronos-ai/core/cross-spawn-spawner"
import { testEffect } from "../lib/effect"

const node = AppNodeBuilder.build(CrossSpawnSpawner.node)
const it = testEffect(Layer.mergeAll(AppNodeBuilder.build(Agent.node), AppNodeBuilder.build(ToolRegistry.node), node))
const ref = {
  providerID: ProviderV2.ID.make("test"),
  modelID: ModelV2.ID.make("test-model"),
}

afterEach(async () => {
  await disposeAllInstances()
})

describe("qronos tool registry indexing", () => {
  const logger = Log.create({ service: "qronos-tool-registry" })

  it.live("omits semantic_search without waiting for slow indexing startup", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const avail = spyOn(QronosIndexing, "available").mockImplementation(() => new Promise<boolean>(() => {}))

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).not.toContain("semantic_search")
            expect(ids).not.toContain("codesearch")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(avail).not.toHaveBeenCalled()
          } finally {
            avail.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("registers semantic search from config even when readiness throws", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready failed")
          const ready = spyOn(QronosIndexing, "ready").mockImplementation(() => {
            throw err
          })
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn).not.toHaveBeenCalled()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("registers semantic search from config even when readiness rejects", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready rejected")
          const ready = spyOn(QronosIndexing, "ready").mockImplementation(() => Promise.reject(err) as unknown as boolean)
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn).not.toHaveBeenCalled()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("registers semantic_search when indexing is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(QronosIndexing, "ready").mockReturnValue(true)

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("omits semantic_search hint from glob and grep descriptions when indexing is not ready", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(QronosIndexing, "ready").mockReturnValue(false)

          try {
            const agent = yield* Agent.Service
            const build = yield* agent.get("build")
            const registry = yield* ToolRegistry.Service
            const tools = yield* registry.tools({ ...ref, agent: build })
            const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
            const grep = tools.find((tool) => tool.id === "grep")?.description ?? ""

            expect(glob).not.toContain("semantic_search")
            expect(grep).not.toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("includes semantic_search hint in glob and grep descriptions when indexing is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(QronosIndexing, "ready").mockReturnValue(true)

          try {
            const agent = yield* Agent.Service
            const build = yield* agent.get("build")
            const registry = yield* ToolRegistry.Service
            const tools = yield* registry.tools({ ...ref, agent: build })
            const ids = tools.map((tool) => tool.id)
            const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
            const grep = tools.find((tool) => tool.id === "grep")?.description ?? ""

            expect(ids).toContain("semantic_search")
            expect(glob).toContain("semantic_search")
            expect(grep).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("follows VS Code project consent for semantic_search without config enablement", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        const prev = process.env["QRONOS_PLATFORM"]
        process.env["QRONOS_PLATFORM"] = "vscode"
        return prev
      }),
      () =>
        provideTmpdirInstance(
          () =>
            Effect.gen(function* () {
              const agent = yield* Agent.Service
              const build = yield* agent.get("build")
              const registry = yield* ToolRegistry.Service
              const check = Effect.fnUntraced(function* (enabled: boolean) {
                const tools = yield* registry.tools({ ...ref, agent: build })
                const ids = tools.map((tool) => tool.id)
                const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
                expect(ids.includes("semantic_search")).toBe(enabled)
                expect(glob.includes("semantic_search")).toBe(enabled)
              })

              yield* check(false)
              yield* Effect.promise(() => QronosIndexing.setConsent(true))
              yield* check(true)
              yield* Effect.promise(() => QronosIndexing.setConsent(false))
              yield* check(false)
            }),
          { git: true },
        ),
      (prev) =>
        Effect.sync(() => {
          if (prev === undefined) delete process.env["QRONOS_PLATFORM"]
          if (prev !== undefined) process.env["QRONOS_PLATFORM"] = prev
        }),
    ),
  )

  for (const client of ["cli", "vscode", "jetbrains"]) {
    it.live(`omits interactive_terminal from ${client} tool definitions`, () =>
      Effect.acquireUseRelease(
        Effect.sync(() => {
          const prev = process.env["QRONOS_CLIENT"]
          process.env["QRONOS_CLIENT"] = client
          return prev
        }),
        () =>
          provideTmpdirInstance(
            () =>
              Effect.gen(function* () {
                const agents = yield* Agent.Service
                const registry = yield* ToolRegistry.Service
                expect(yield* registry.ids()).not.toContain("interactive_terminal")
                for (const name of ["build", "explore"]) {
                  const agent = yield* agents.get(name)
                  const tools = yield* registry.tools({ ...ref, agent })
                  expect(tools.map((tool) => tool.id)).not.toContain("interactive_terminal")
                }
              }),
            {
              git: true,
              config: { permission: { interactive_terminal: "allow" } },
            },
          ),
        (prev) =>
          Effect.sync(() => {
            if (prev === undefined) delete process.env["QRONOS_CLIENT"]
            if (prev !== undefined) process.env["QRONOS_CLIENT"] = prev
          }),
      ),
    )
  }

  test("enables semantic search from indexing configuration before the index is ready", () => {
    expect(
      QronosToolRegistry.indexing({
        indexing: { enabled: true },
      }),
    ).toBe(true)
    expect(
      QronosToolRegistry.indexing({
        indexing: { enabled: false },
      }),
    ).toBe(false)
    expect(QronosToolRegistry.indexing({}, { indexing: { enabled: true } })).toBe(true)
  })

  it.live("omits memory tools when project memory is disabled but keeps qronos_local_recall", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const agent = yield* Agent.Service
          const build = yield* agent.get("build")
          const registry = yield* ToolRegistry.Service
          const tools = yield* registry.tools({ ...ref, agent: build })
          const ids = tools.map((tool) => tool.id)

          expect(ids).not.toContain("qronos_memory_recall")
          expect(ids).not.toContain("qronos_memory_save")
          // qronos_local_recall is a transcript-recall tool gated by `recall: "ask"` in agent
          // permissions; it must NOT be coupled to project-memory enablement.
          expect(ids).toContain("qronos_local_recall")
        }),
      { git: true },
    ),
  )

  it.live("memoryToolsEnabled coalesces consecutive probes within the TTL", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ctx = yield* InstanceState.context
          const probe = spyOn(QronosMemory, "toolEnabled")

          try {
            const a = yield* QronosToolRegistry.memoryToolsEnabled({ ctx })
            const b = yield* QronosToolRegistry.memoryToolsEnabled({ ctx })
            const c = yield* QronosToolRegistry.memoryToolsEnabled({ ctx })

            expect([a, b, c]).toEqual([false, false, false])
            // Cache hit: only the first call should reach QronosMemory.toolEnabled.
            expect(probe).toHaveBeenCalledTimes(1)
          } finally {
            probe.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("memoryToolsEnabled reflects enable/disable immediately after invalidate", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ctx = yield* InstanceState.context
          const root = (yield* Effect.promise(() => QronosMemory.prepare({ ctx }))).toString()

          const first = yield* QronosToolRegistry.memoryToolsEnabled({ ctx })
          expect(first).toBe(false)

          yield* Effect.promise(() => QronosMemory.enable({ ctx }))

          // The bootstrap MemoryEvents subscriber invalidates on mutation; call it directly here.
          QronosToolRegistry.invalidateMemoryEnabled(root)
          const afterEnable = yield* QronosToolRegistry.memoryToolsEnabled({ ctx })
          expect(afterEnable).toBe(true)

          yield* Effect.promise(() => QronosMemory.disable({ ctx }))

          QronosToolRegistry.invalidateMemoryEnabled(root)
          const afterDisable = yield* QronosToolRegistry.memoryToolsEnabled({ ctx })
          expect(afterDisable).toBe(false)
        }),
      { git: true },
    ),
  )

  it.live("includes memory tools when project memory is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ctx = yield* InstanceState.context
          yield* Effect.promise(() => QronosMemory.enable({ ctx }))

          const agent = yield* Agent.Service
          const build = yield* agent.get("build")
          const registry = yield* ToolRegistry.Service
          const tools = yield* registry.tools({ ...ref, agent: build })
          const ids = tools.map((tool) => tool.id)

          expect(ids).toContain("qronos_memory_recall")
          expect(ids).toContain("qronos_memory_save")
          expect(ids).toContain("qronos_local_recall")
        }),
      { git: true },
    ),
  )

  test("conditionally includes Qronos registry extras", () => {
    const prev = process.env["QRONOS_CLIENT"]
    const def = (id: string): Tool.Def => ({
      id,
      description: id,
      parameters: Schema.String,
      execute: () => Effect.succeed({ title: id, output: id, metadata: {} }),
    })
    const tools = {
      semantic: def("semantic_search"),
      recall: def("recall"),
      managerModels: def("agent_manager_models"),
      memory: def("qronos_memory_recall"),
      save: def("qronos_memory_save"),
      manager: def("agent_manager"),
      process: def("background_process"),
      browser: def("browser_open"),
      chart: def("chart"),
      image: def("generate_image"),
      notify: def("notify_user"),
      send: def("send_file"),
      linkPr: def("link_pr"),
      boardRead: def("board_read"),
      boardPost: def("board_post"),
      notebookRead: def("notebook_read"),
      notebookEdit: def("notebook_edit"),
      notebookExecute: def("notebook_execute"),
    }
    const flags = { experimentalSharedAgentBoard: false }

    try {
      process.env["QRONOS_CLIENT"] = "cli"
      expect(QronosToolRegistry.extra(tools, {}, flags).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "background_process",
        "agent_manager_models",
        "notify_user",
        "send_file",
        "link_pr",
      ])
      expect(
        QronosToolRegistry.extra(tools, { experimental: { image_generation: true } }, flags).map((tool) => tool.id),
      ).toEqual([
        "generate_image",
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "background_process",
        "agent_manager_models",
        "notify_user",
        "send_file",
        "link_pr",
      ])

      process.env["QRONOS_CLIENT"] = "vscode"
      expect(QronosToolRegistry.extra(tools, {}, flags).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "chart",
        "background_process",
        "agent_manager_models",
        "agent_manager",
        "browser_open",
        "notify_user",
        "send_file",
      ])
      expect(
        QronosToolRegistry.extra(
          tools,
          {
            experimental: { native_notebook_tools: true },
          },
          flags,
        ).map((tool) => tool.id),
      ).toEqual([
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "chart",
        "background_process",
        "agent_manager_models",
        "agent_manager",
        "browser_open",
        "notebook_read",
        "notebook_edit",
        "notebook_execute",
        "notify_user",
        "send_file",
      ])
      expect(QronosToolRegistry.extra({ ...tools, semantic: undefined }, {}, flags).map((tool) => tool.id)).toEqual([
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "chart",
        "background_process",
        "agent_manager_models",
        "agent_manager",
        "browser_open",
        "notify_user",
        "send_file",
      ])

      process.env["QRONOS_CLIENT"] = "desktop"
      expect(QronosToolRegistry.extra(tools, {}, flags).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "agent_manager_models",
        "notify_user",
        "send_file",
      ])

      process.env["QRONOS_CLIENT"] = "run"
      expect(QronosToolRegistry.extra(tools, {}, flags).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "agent_manager_models",
        "notify_user",
        "send_file",
      ])

      process.env["QRONOS_CLIENT"] = "acp"
      expect(QronosToolRegistry.extra(tools, {}, flags).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "qronos_memory_recall",
        "qronos_memory_save",
        "recall",
        "agent_manager_models",
        "notify_user",
        "send_file",
      ])
      for (const client of ["cli", "vscode", "jetbrains", "desktop", "run", "acp"]) {
        process.env["QRONOS_CLIENT"] = client
        for (const enabled of [false, true]) {
          const ids = QronosToolRegistry.extra(
            tools,
            { shared_agent_board: enabled },
            { experimentalSharedAgentBoard: enabled },
          )
            .map((tool) => tool.id)
            .filter((id) => id.startsWith("board_"))
          expect(ids).toEqual(enabled ? ["board_read", "board_post"] : [])
        }
      }
      const flagged = QronosToolRegistry.extra(tools, {}, { experimentalSharedAgentBoard: true })
        .map((tool) => tool.id)
        .filter((id) => id.startsWith("board_"))
      expect(flagged).toEqual(["board_read", "board_post"])
    } finally {
      if (prev === undefined) delete process.env["QRONOS_CLIENT"]
      if (prev !== undefined) process.env["QRONOS_CLIENT"] = prev
    }
  })

  test("logs indexing bootstrap failures without blocking session bootstrap", async () => {
    const platform = process.env["QRONOS_PLATFORM"]
    process.env["QRONOS_PLATFORM"] = "cli"
    const logger = Log.create({ service: "qronos-bootstrap" })
    const err = new Error("indexing init failed")
    const calls: string[] = []
    const sessions = Layer.succeed(
      QronosSessions.Service,
      QronosSessions.Service.of({
        init: () => Effect.sync(() => calls.push("sessions")),
        sendAgentNotification: () => Effect.succeed({ ok: false as const, reason: "not_connected" }),
        reportSessionTitle: () => Effect.succeed({ ok: false as const, reason: "not_connected" }),
      }),
    )
    const bus = Layer.succeed(
      Bus.Service,
      Bus.Service.of({
        publish: () => Effect.void,
        subscribe: () => Effect.succeed(Stream.empty),
        subscribeAll: () => Effect.succeed(Stream.empty),
        subscribeCallback: () => Effect.succeed(() => {}),
        subscribeAllCallback: () => Effect.succeed(() => {}),
      }),
    )
    const memory = Layer.succeed(MemoryService.Service, MemoryService.make())
    const session = Layer.succeed(Session.Service, {} as Session.Interface)
    const summary = Layer.succeed(SessionSummary.Service, {} as SessionSummary.Interface)
    const provider = Layer.succeed(Provider.Service, {} as Provider.Interface)
    const config = Layer.succeed(Config.Service, {} as Config.Interface)
    const watcher = Layer.succeed(QronosWatcher.Service, QronosWatcher.Service.of({ init: () => Effect.void }))
    const wakeup = Layer.succeed(
      Wakeup.Service,
      Wakeup.Service.of({
        schedule: () => Effect.die(new Error("wakeup schedule is not used by this test")),
        list: () => Effect.succeed([]),
        pending: () => Effect.succeed([]),
        scheduled: () => Effect.succeed(new Map()),
        cancel: () => Effect.succeed(undefined),
        cancelSession: () => Effect.succeed(0),
        adopt: () => Effect.void,
        cronCreate: () => Effect.die(new Error("wakeup cronCreate is not used by this test")),
        cronList: () => Effect.succeed([]),
        cronCancel: () => Effect.succeed(undefined),
      }),
    )
    const indexing = spyOn(QronosIndexing, "init").mockRejectedValue(err)
    const warn = spyOn(logger, "warn").mockImplementation(() => {})

    try {
      await Effect.runPromise(
        QronosBootstrap.Service.use((svc) => svc.init()).pipe(
          Effect.provide(
            QronosBootstrap.layer.pipe(
              Layer.provide([sessions, bus, memory, session, summary, provider, config, watcher, wakeup]),
            ),
          ),
          Effect.scoped,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(calls).toEqual(["sessions"])
      expect(indexing).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith("indexing bootstrap failed", { err })
    } finally {
      if (platform === undefined) delete process.env["QRONOS_PLATFORM"]
      else process.env["QRONOS_PLATFORM"] = platform
      indexing.mockRestore()
      warn.mockRestore()
    }
  })
})

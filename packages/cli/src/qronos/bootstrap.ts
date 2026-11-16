import { Cause, Context, Effect, Layer } from "effect"
import { EffectBridge } from "@/effect/bridge"
import { QronosSessions } from "@/qronos-sessions/qronos-sessions"
import * as Log from "@qronos-ai/core/util/log"
import { Global } from "@qronos-ai/core/global"
import { InstallationVersion } from "@qronos-ai/core/installation/version"
import path from "node:path"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { Provider } from "@/provider/provider"
import { Session } from "@/session/session"
import { SessionSummary } from "@/session/summary"
import { SessionExport } from "@/qronos/session-export"
import { createWorkspaceProvider } from "@/qronos/session-export/workspace-provider"
import { Instance } from "@/qronos/instance"
import { InstanceRef } from "@/effect/instance-ref"
import { Identity } from "@qronos-ai/telemetry"
import { MemoryLifecycle } from "@/qronos/memory/turn"
import { MemoryService } from "@qronos-ai/memory/effect/service"
import { MemoryEvents } from "@/qronos/memory/events"
import { installMemoryRuntime } from "@/qronos/memory/runtime"
import { QronosToolRegistry } from "@/qronos/tool/registry"
import { Wakeup } from "@/qronos/wakeup"
import { LayerNode } from "@qronos-ai/core/effect/layer-node"
import { QronosWatcher } from "@/qronos/watcher"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder" // qronos_change

const log = Log.create({ service: "qronos-bootstrap" })

export namespace QronosBootstrap {
  export interface Interface {
    readonly init: () => Effect.Effect<void, unknown>
  }

  export class Service extends Context.Service<Service, Interface>()("@qronos-ai/Bootstrap") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      // Bind the package memory effect layer to opencode (paths, instance binder, logger, event sink).
      installMemoryRuntime()
      const qronos = yield* QronosSessions.Service
      const bus = yield* Bus.Service
      const sessions = yield* Session.Service
      const summary = yield* SessionSummary.Service
      const provider = yield* Provider.Service
      const config = yield* Config.Service
      const memory = yield* MemoryService.Service
      const watcher = yield* QronosWatcher.Service
      const wake = yield* Wakeup.Service

      const init = Effect.fn("QronosBootstrap.init")(function* () {
        yield* watcher.init()
        yield* qronos.init()
        yield* MemoryLifecycle.subscribe({ bus, sessions, summary, provider, config, memory })
        // Invalidate enabled cache on every memory state mutation (properties.directory holds the memory root).
        yield* bus.subscribeCallback(MemoryEvents.Status, (evt) =>
          QronosToolRegistry.invalidateMemoryEnabled(evt.properties.directory),
        )
        yield* bus.subscribeCallback(MemoryEvents.Updated, (evt) =>
          QronosToolRegistry.invalidateMemoryEnabled(evt.properties.directory),
        )
        // Re-arm this directory's persisted wakeups on every instance start: overdue ones
        // fire immediately, the rest get their timers. A failure must not block bootstrap.
        const inst = yield* InstanceRef
        if (inst) {
          yield* wake.adopt(inst.directory).pipe(
            Effect.catchCause((cause) =>
              Effect.sync(() => log.warn("wakeup adopt failed", { err: Cause.squash(cause) })),
            ),
          )
        }
        // Session export bootstrap.
        yield* Effect.gen(function* () {
          if (!SessionExport.enabled) return
          const anon = yield* EffectBridge.fromPromise(() =>
            Identity.getMachineId().catch((err) => {
              log.warn("session export identity failed", { err })
              return undefined
            }),
          )
          SessionExport.init({
            agentVersion: InstallationVersion,
            anonId: anon,
            dbPath: path.join(Global.Path.data, "session-export.db"),
            workspaceKey: Instance.directory,
            subscribeAll: (cb) => Bus.subscribeAll(cb),
            snapshotProvider: createWorkspaceProvider({
              root: Instance.directory,
              statePath: path.join(Global.Path.data, "session-export-workspace.json"),
            }),
          })
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn("session export bootstrap failed", { err: Cause.squash(cause) })),
          ),
        )
        if (process.env["QRONOS_PLATFORM"] !== "vscode") {
          yield* EffectBridge.fromPromise(() =>
            import("@/qronos/indexing").then((mod) => mod.QronosIndexing.init()),
          ).pipe(
            Effect.catchCause((cause) =>
              Effect.sync(() => log.warn("indexing bootstrap failed", { err: Cause.squash(cause) })),
            ),
            Effect.forkDetach,
          )
        }
      })

      return Service.of({ init })
    }),
  )

  export const defaultLayer = layer.pipe(
    Layer.provide([
      QronosSessions.defaultLayer,
      Session.defaultLayer,
      AppNodeBuilder.build(SessionSummary.node),
      AppNodeBuilder.build(Provider.node),
      AppNodeBuilder.build(Config.node),
      MemoryService.layer,
      Bus.defaultLayer,
      QronosWatcher.defaultLayer,
      AppNodeBuilder.build(Wakeup.node),
    ]),
  )

  const memory = LayerNode.make({ service: MemoryService.Service, layer: MemoryService.layer, deps: [] })
  const watcher = LayerNode.make({ service: QronosWatcher.Service, layer: QronosWatcher.defaultLayer, deps: [] })
  export const node = LayerNode.suspend(() =>
    LayerNode.make({
      service: Service,
      layer,
      deps: [
        QronosSessions.node,
        Session.node,
        SessionSummary.node,
        Provider.node,
        Config.node,
        memory,
        Bus.node,
        watcher,
        Wakeup.node,
      ],
    }),
  )
}

process.env["QRONOS_DISABLE_SESSION_INGEST"] = "0"
delete process.env["QRONOS_REMOTE"]

import { expect, spyOn } from "bun:test"
import { AppNodeBuilder } from "@qronos-ai/core/effect/app-node-builder"
import { CrossSpawnSpawner } from "@qronos-ai/core/cross-spawn-spawner"
import { Effect, Layer } from "effect"
import { Auth } from "../../../src/auth"
import { Bus } from "../../../src/bus"
import { GlobalBus } from "../../../src/bus/global"
import { clearInFlightCache } from "../../../src/qronos-sessions/inflight-cache"
import type { IngestQueue } from "../../../src/qronos-sessions/ingest-queue"
import { Session } from "../../../src/session/session"
import { SessionID } from "../../../src/session/schema"
import { SessionStatus } from "../../../src/session/status"
import { TestConfig } from "../../fixture/config"
import { TestInstance } from "../../fixture/fixture"
import { pollWithTimeout, testEffect } from "../../lib/effect"

// Watcher enablement is read at module load, after applying the isolated test environment.
const { QronosSessions } = await import("../../../src/qronos-sessions/qronos-sessions")
const it = testEffect(AppNodeBuilder.build(CrossSpawnSpawner.node))
const layer = Layer.merge(
  QronosSessions.layer.pipe(
    Layer.provideMerge(Bus.layer),
    Layer.provide(TestConfig.layer({ getGlobal: () => Effect.succeed({ remote_control: false }) })),
    Layer.provide(AppNodeBuilder.build(Session.node)),
  ),
  AppNodeBuilder.build(Auth.node),
)

it.instance(
  "captures every startup status synchronously before asynchronous ingest and remote enable",
  () => {
    const token = process.env.QRONOS_API_KEY
    const base = process.env.QRONOS_SESSION_INGEST_URL
    const sent: IngestQueue.Data[] = []
    const blocked = Promise.withResolvers<void>()
    const reached = Promise.withResolvers<void>()
    let gate: Promise<void> | undefined
    process.env.QRONOS_API_KEY = "status-occurrence-token"
    process.env.QRONOS_SESSION_INGEST_URL = "https://ingest.test"
    const reset = () => {
      clearInFlightCache("qronos-sessions:token")
      clearInFlightCache("qronos-sessions:client")
      clearInFlightCache("qronos-sessions:token-valid:status-occurrence-token")
    }
    reset()
    const request = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          if (url.endsWith("/api/user")) {
            if (gate) {
              reached.resolve()
              await gate
            }
            return new Response("{}", { status: 200 })
          }
          if (url.endsWith("/api/session")) {
            return Response.json({ id: "status-occurrence-remote", ingestPath: "/api/ingest/status-occurrence" })
          }
          if (url === "https://ingest.test/api/ingest/status-occurrence?v=2") {
            const payload: { data: IngestQueue.Data[] } = JSON.parse(String(init?.body))
            sent.push(...payload.data)
            return new Response("{}", { status: 200 })
          }
          throw new Error(`Unexpected request: ${url}`)
        },
        { preconnect: globalThis.fetch.preconnect },
      ),
    )

    return Effect.gen(function* () {
      const auth = yield* Auth.Service
      const instance = yield* TestInstance
      const qronos = yield* QronosSessions.Service
      yield* auth.set("qronos", { type: "api", key: "status-occurrence-token" })
      yield* qronos.init()
      expect(QronosSessions.remoteStatus().enabled).toBe(false)
      const id = SessionID.descending()
      yield* Effect.promise(() => QronosSessions.bootstrap(id))
      reset()
      gate = blocked.promise
      const before = Date.now()
      const events: SessionStatus.Info[] = [
        { type: "busy" },
        { type: "idle" },
        { type: "busy" },
        { type: "retry", attempt: 1, message: "retrying", next: before + 1000 },
        { type: "retry", attempt: 2, message: "retrying again", next: before + 2000 },
      ]
      for (const [index, status] of events.entries()) {
        GlobalBus.emit("event", {
          directory: instance.directory,
          payload: {
            id: `status-${index}`,
            type: SessionStatus.Event.Status.type,
            properties: { sessionID: id, status },
          },
        })
      }
      const after = Date.now()
      yield* Effect.promise(() => reached.promise)
      blocked.resolve()
      const records = yield* pollWithTimeout(
        Effect.sync(() => {
          const records = sent.filter((item) => item.type === "session_status")
          return records.length >= 4 ? records : undefined
        }),
        "startup status occurrences were not ingested",
      )
      expect(records.map((item) => item.data.status)).toEqual(["busy", "idle", "busy", "retry"])
      expect(records.map((item) => item.data.previousStatus)).toEqual([null, "busy", "idle", "busy"])
      const ids = records.map((item) => item.data.transitionId)
      expect(new Set(ids).size).toBe(4)
      expect(ids).toEqual([...ids].sort())
      for (const item of records) {
        expect(item.data.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        const occurrence = Date.parse(item.data.occurredAt ?? "")
        expect(occurrence).toBeGreaterThanOrEqual(before)
        expect(occurrence).toBeLessThanOrEqual(after)
      }
      expect(QronosSessions.remoteStatus().enabled).toBe(false)
    }).pipe(
      Effect.ensuring(
        Effect.gen(function* () {
          blocked.resolve()
          const auth = yield* Auth.Service
          yield* auth.remove("qronos").pipe(Effect.orDie)
          request.mockRestore()
          if (token === undefined) delete process.env.QRONOS_API_KEY
          else process.env.QRONOS_API_KEY = token
          if (base === undefined) delete process.env.QRONOS_SESSION_INGEST_URL
          else process.env.QRONOS_SESSION_INGEST_URL = base
          reset()
        }),
      ),
      Effect.provide(layer),
    )
  },
  30_000,
)

it.instance(
  "a status that cannot be derived at event time never throws into the event publisher",
  () => {
    const seen: string[] = []
    const later = (event: { payload?: { id?: string } }) => {
      if (event.payload?.id) seen.push(event.payload.id)
    }
    return Effect.gen(function* () {
      const instance = yield* TestInstance
      const qronos = yield* QronosSessions.Service
      yield* qronos.init()
      GlobalBus.on("event", later)
      // An unparseable session id makes the synchronous derivation fail.
      expect(() =>
        GlobalBus.emit("event", {
          directory: instance.directory,
          payload: {
            id: "status-underivable",
            type: SessionStatus.Event.Status.type,
            properties: { sessionID: "not-a-session", status: { type: "busy" } },
          },
        }),
      ).not.toThrow()
      expect(seen).toEqual(["status-underivable"])
    }).pipe(Effect.ensuring(Effect.sync(() => void GlobalBus.off("event", later))), Effect.provide(layer))
  },
  30_000,
)

import { describe, expect, mock, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Auth } from "@/auth"

const attachedCalls: string[][] = []

const realSessions = await import("@/qronos-sessions/qronos-sessions")
const realSetAttached = realSessions.QronosSessions.setAttachedSessions
mock.module("@/qronos-sessions/qronos-sessions", () => ({
  ...realSessions,
  QronosSessions: {
    ...realSessions.QronosSessions,
    setAttachedSessions: (ids: readonly string[]) => {
      attachedCalls.push([...ids])
      realSetAttached(ids)
    },
  },
}))

const { QronosViewers } = await import("@/qronos/presence/service")

const authLayer = Layer.succeed(
  Auth.Service,
  Auth.Service.of({
    get: () => Effect.succeed(undefined),
    all: () => Effect.succeed({} as never),
    set: () => Effect.void,
    remove: () => Effect.void,
  }),
)

const layer = QronosViewers.layer.pipe(Layer.provide(authLayer))

const uid = "11111111-1111-4111-8111-111111111111"

function run(body: (viewers: {
  update: (s: {
    viewer: { id: string; active: boolean }
    attached: readonly string[]
    visible: readonly string[]
  }) => Effect.Effect<void>
  invalidateAuth: () => Effect.Effect<void>
}) => Effect.Effect<void>) {
  return Effect.gen(function* () {
    const v = yield* QronosViewers.Service
    yield* body(v)
  }).pipe(Effect.provide(layer), Effect.runPromise)
}

describe("QronosViewers.Service", () => {
  test("pushes the attached union to QronosSessions on change", async () => {
    attachedCalls.length = 0
    await run((v) => v.update({ viewer: { id: uid, active: true }, attached: ["ses_a"], visible: ["ses_a"] }))
    expect(attachedCalls).toEqual([["ses_a"], []])
  })

  test("does not re-push an unchanged attached union", async () => {
    attachedCalls.length = 0
    await run((v) =>
      Effect.gen(function* () {
        yield* v.update({ viewer: { id: uid, active: true }, attached: ["ses_a"], visible: ["ses_a"] })
        yield* v.update({ viewer: { id: uid, active: true }, attached: ["ses_a"], visible: ["ses_a"] })
      }),
    )
    expect(attachedCalls).toEqual([["ses_a"], []])
  })

  test("unions attached sessions across viewers", async () => {
    attachedCalls.length = 0
    await run((v) =>
      Effect.gen(function* () {
        yield* v.update({ viewer: { id: uid, active: true }, attached: ["ses_a"], visible: ["ses_a"] })
        yield* v.update({ viewer: { id: "22222222-2222-4222-8222-222222222222", active: false }, attached: ["ses_b"], visible: [] })
      }),
    )
    expect(attachedCalls).toEqual([["ses_a"], ["ses_a", "ses_b"], []])
  })

  test("invalidateAuth does not throw and clears presence state", async () => {
    attachedCalls.length = 0
    await run((v) =>
      Effect.gen(function* () {
        yield* v.update({ viewer: { id: uid, active: true }, attached: ["ses_a"], visible: ["ses_a"] })
        yield* v.invalidateAuth()
      }),
    )
    expect(attachedCalls.length).toBeGreaterThanOrEqual(1)
  })
})

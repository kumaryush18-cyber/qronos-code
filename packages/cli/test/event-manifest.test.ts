import { describe, expect, test } from "bun:test"
import { SessionEvent } from "@qronos-ai/core/session/event"
import { EventManifest as SchemaEventManifest } from "@qronos-ai/schema/event-manifest"
import { Todo } from "@/session/todo"
import { EventManifest } from "@/event-manifest"
import { Drained, Interrupted } from "@qronos-ai/schema/qronos/session-drain" // qronos_change
import { Availability as SessionHostAvailability } from "@qronos-ai/schema/qronos/session-host-event" // qronos_change
import { Continuation as SessionHostContinuation } from "@qronos-ai/schema/qronos/session-host-event" // qronos_change
import { Pending as WakeupPending } from "@qronos-ai/schema/qronos/wakeup-event" // qronos_change
import { AuthUrl } from "@qronos-ai/schema/mcp-event" // qronos_change

describe("public event manifest", () => {
  test("contains every latest public wire type once", () => {
    expect(EventManifest.Definitions).toBe(SchemaEventManifest.Definitions)
    expect(EventManifest.Latest).toBe(SchemaEventManifest.Latest)
    expect(EventManifest.Durable).toBe(SchemaEventManifest.Durable)
    expect(EventManifest.Latest.size).toBe(96) // qronos_change - include session drain, wakeup, session host availability/continuation, and MCP auth events
    expect(EventManifest.Latest.get("session.drained")).toBe(Drained) // qronos_change
    expect(EventManifest.Latest.get("session.drain.interrupted")).toBe(Interrupted) // qronos_change
    expect(EventManifest.Latest.get("session.wakeup")).toBe(WakeupPending) // qronos_change
    expect(EventManifest.Latest.get("session.host.availability")).toBe(SessionHostAvailability) // qronos_change
    expect(EventManifest.Latest.get("session.host.continuation")).toBe(SessionHostContinuation) // qronos_change
    expect(EventManifest.Latest.get("mcp.auth.url")).toBe(AuthUrl) // qronos_change
    expect(EventManifest.Latest.get("session.next.step.ended")).toBe(SessionEvent.Step.Ended)
    expect(EventManifest.Latest.get("todo.updated")).toBe(Todo.Event.Updated)
    expect(EventManifest.Latest.has("ide.installed")).toBe(false)
    expect(EventManifest.Latest.has("server.connected")).toBe(true)
    expect(EventManifest.Latest.has("global.disposed")).toBe(true)
    expect(EventManifest.Latest.has("global.config.updated")).toBe(true) // qronos_change
  })

  test("contains only the current step settlement versions", () => {
    expect(EventManifest.Durable.has("session.next.step.ended.1")).toBe(false)
    expect(EventManifest.Durable.get("session.next.step.ended.2")).toBe(SessionEvent.Step.Ended)
  })
})

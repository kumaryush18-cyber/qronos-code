// qronos_change - new file
import { describe, expect, test } from "bun:test"
import { QronosRunAuto } from "../../src/qronos/cli/run-auto"

describe("QronosRunAuto", () => {
  test("tracks task child sessions without allowing unrelated sessions", () => {
    const state = QronosRunAuto.create("ses_root")

    expect(QronosRunAuto.allowed(state, "ses_root")).toBe(true)
    expect(QronosRunAuto.allowed(state, "ses_child")).toBe(false)

    QronosRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_root",
      state: {
        metadata: {
          sessionId: "ses_child",
        },
      },
    })

    expect(QronosRunAuto.allowed(state, "ses_child")).toBe(true)
    QronosRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_child",
      state: { metadata: { sessionId: "ses_grandchild" } },
    })
    expect(QronosRunAuto.allowed(state, "ses_grandchild")).toBe(true)
    expect(QronosRunAuto.allowed(state, "ses_other")).toBe(false)
  })

  test("ignores malformed or untrusted task metadata", () => {
    const state = QronosRunAuto.create("ses_root")

    QronosRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_root",
      state: {
        metadata: {
          sessionId: "",
        },
      },
    })
    QronosRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_other",
      state: {
        metadata: {
          sessionId: "ses_wrong",
        },
      },
    })
    QronosRunAuto.track(state, {
      type: "text",
      sessionID: "ses_root",
      state: {},
    })

    expect(QronosRunAuto.allowed(state, "ses_wrong")).toBe(false)
    expect(QronosRunAuto.allowed(state, "")).toBe(false)
  })
})

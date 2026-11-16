import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { QronosCli } from "../../../src/qronos/cli/setup"
import { createHelpCommand } from "../../../src/qronos/help-command"
import { resetLazyCommandSelection } from "../../../src/qronos/cli/lazy-commands"
import yargs from "yargs"

describe("CLI bootstrap runtime selection", () => {
  beforeEach(resetLazyCommandSelection)
  afterEach(resetLazyCommandSelection)

  test("uses the narrow runtime for worker-backed TUI launches", () => {
    expect(QronosCli.workerTui({ _: [] })).toBe(true)
    expect(QronosCli.workerTui({ _: ["./project"] })).toBe(true)
  })

  test("keeps full bootstrap for explicit, mini, and worktree commands", () => {
    expect(QronosCli.workerTui({ _: [], mini: true })).toBe(false)
    expect(QronosCli.workerTui({ _: [], worktree: "feature" })).toBe(false)
  })

  test("keeps full bootstrap when the eager help command is selected", () => {
    const command = createHelpCommand()
    if (typeof command.builder !== "function") throw new Error("help builder is not a function")
    command.builder(yargs([]))
    expect(QronosCli.workerTui({ _: [] })).toBe(false)
  })
})

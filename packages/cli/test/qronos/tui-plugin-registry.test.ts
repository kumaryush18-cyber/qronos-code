import { expect, test } from "bun:test"
import { internalTuiPlugins } from "@/plugin/tui/internal"

const qronos = [
  "internal:home-news",
  "internal:home-onboarding",
  "internal:qronos-attention",
  "internal:qronos-home-footer",
  "internal:qronos-permissions",
  "internal:qronos-sidebar-footer",
  "internal:qronos-sidebar-memory",
  "internal:qronos-memory-palette",
  "internal:qronos-sidebar-background-processes",
  "internal:qronos-sidebar-indexing",
  "internal:qronos-sidebar-pr",
  "internal:qronos-sidebar-usage",
  "internal:sandbox",
  "internal:remote",
  "internal:reload",
]

test("internal TUI registry preserves every Qronos plugin before upstream builtins", () => {
  const ids = internalTuiPlugins({ experimentalEventSystem: false, experimentalSessionSwitcher: false }).map(
    (plugin) => plugin.id,
  )

  expect(ids.slice(0, qronos.length)).toEqual(qronos)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).toContain("internal:sidebar-context")
  expect(ids).toContain("diff-viewer")
})

test("experimental Qronos TUI plugins remain wired", () => {
  const ids = internalTuiPlugins({ experimentalEventSystem: true, experimentalSessionSwitcher: true }).map(
    (plugin) => plugin.id,
  )

  expect(ids).toContain("internal:session-v2-debug")
  expect(ids).toContain("internal:session-switcher")
})

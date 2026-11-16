// qronos_change - new file
import { expect, test } from "bun:test"
import { cliCommand } from "../../src/cli/cmd/pr"

test("cliCommand uses the current script when argv[1] is a file path", () => {
  const result = cliCommand({
    execPath: "/usr/bin/node",
    argv: ["/usr/bin/node", "/tmp/qronos.js", "pr", "1"],
    exists: (file) => file === "/tmp/qronos.js",
  })

  expect(result).toEqual(["/usr/bin/node", "/tmp/qronos.js"])
})

test("cliCommand falls back to execPath when argv[1] is a subcommand", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/qronos",
    argv: ["/usr/local/bin/qronos", "pr", "1"],
    exists: () => false,
  })

  expect(result).toEqual(["/usr/local/bin/qronos"])
})

test("cliCommand ignores subcommand token even when it exists on disk", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/qronos",
    argv: ["/usr/local/bin/qronos", "pr", "1"],
    exists: (file) => file === "pr",
  })

  expect(result).toEqual(["/usr/local/bin/qronos"])
})

test("cliCommand falls back to execPath when argv[1] is missing", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/qronos",
    argv: ["/usr/local/bin/qronos"],
    exists: () => false,
  })

  expect(result).toEqual(["/usr/local/bin/qronos"])
})

test("cliCommand falls back to execPath for bun virtual script paths", () => {
  const unix = cliCommand({
    execPath: "/tmp/qronos",
    argv: ["/tmp/qronos", "/$bunfs/root/src/index.js", "pr", "1"],
    exists: () => true,
  })

  const win = cliCommand({
    execPath: "C:/tmp/qronos.exe",
    argv: ["C:/tmp/qronos.exe", "B:/~BUN/root/src/index.js", "pr", "1"],
    exists: () => true,
  })

  expect(unix).toEqual(["/tmp/qronos"])
  expect(win).toEqual(["C:/tmp/qronos.exe"])
})

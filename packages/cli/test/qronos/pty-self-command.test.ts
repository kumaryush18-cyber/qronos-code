import { describe, expect, test } from "bun:test"
import { QronosPtySelfCommand } from "../../src/qronos/pty/self-command"

describe("pty self-command", () => {
  test("does not forward bundled bun entrypoints", () => {
    const proc = {
      argv: ["/tmp/qronos", "/$bunfs/root/src/index.js"],
      execArgv: ["--user-agent=qronos/test", "--use-system-ca", "--"],
      execPath: "/tmp/qronos",
      cwd: "/tmp",
    }

    const cmd = QronosPtySelfCommand.command(proc)
    expect(cmd).toStrictEqual({ command: "/tmp/qronos", args: [] })
    expect(QronosPtySelfCommand.resolve({ command: "qronos", cwd: "/tmp/project" }, cmd)).toStrictEqual({
      command: "/tmp/qronos",
      args: [],
      cwd: "/tmp/project",
    })
    expect(
      QronosPtySelfCommand.command({
        ...proc,
        argv: ["C:/tmp/qronos.exe", "B:/~BUN/root/src/index.js"],
      }).args,
    ).toStrictEqual([])
    expect(
      QronosPtySelfCommand.command({
        ...proc,
        argv: ["C:/tmp/qronos.exe", "b:\\~BUN\\root\\src\\index.js"],
      }).args,
    ).toStrictEqual([])
  })

  test("forwards source entrypoints", () => {
    const cmd = QronosPtySelfCommand.command({
      argv: ["/tmp/bun", "/tmp/qronos/src/index.ts"],
      execArgv: ["--conditions=browser", "--cwd", "packages/cli"],
      execPath: "/tmp/bun",
      cwd: "/tmp/qronos",
    })
    expect(cmd).toStrictEqual({
      command: "/tmp/bun",
      args: ["--conditions=browser", "/tmp/qronos/src/index.ts"],
      cwd: "/tmp/qronos",
    })
    expect(QronosPtySelfCommand.resolve({ command: "qronos", cwd: "/tmp/project" }, cmd)).toStrictEqual({
      command: "/tmp/bun",
      args: ["--conditions=browser", "/tmp/qronos/src/index.ts", "/tmp/project"],
      cwd: "/tmp/qronos",
    })
  })
})

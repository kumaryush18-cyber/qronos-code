// qronos_change - new file
import { test, expect } from "bun:test"
import path from "path"

test("bin/qronos parses", async () => {
  const file = Bun.file(path.join(import.meta.dir, "..", "..", "bin", "qronos"))
  const code = (await file.text()).replace(/^#![^\n]*\n/, "")
  expect(() => new Function(code)).not.toThrow()
})

import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { hasIndexingPlugin, isIndexingPlugin, normalizePluginName } from "../../../src/detect"

describe("indexing plugin detection", () => {
  test("bundles detect module for browser targets", async () => {
    const dir = await mkdtemp(`${tmpdir()}/kilo-indexing-detect-`)
    const result = await Bun.build({
      entrypoints: [fileURLToPath(new URL("../../../src/detect.ts", import.meta.url))],
      minify: true,
      outdir: dir,
      target: "browser",
    })

    expect(result.success).toBe(true)
  })

  test("normalizes supported plugin forms", () => {
    expect(normalizePluginName("kilo-indexing")).toBe("kilo-indexing")
    expect(normalizePluginName("kilo-indexing@1.2.3")).toBe("kilo-indexing")
    expect(normalizePluginName("@qronos-ai/kilo-indexing")).toBe("@qronos-ai/kilo-indexing")
    expect(normalizePluginName("@qronos-ai/kilo-indexing@1.2.3")).toBe("@qronos-ai/kilo-indexing")
    expect(normalizePluginName("../../packages/kilo-indexing")).toBe("@qronos-ai/kilo-indexing")
    expect(normalizePluginName("file:///tmp/.opencode/plugin/kilo-indexing.js")).toBe("kilo-indexing")
    expect(normalizePluginName("file:///tmp/node_modules/@qronos-ai/kilo-indexing/index.js")).toBe(
      "@qronos-ai/kilo-indexing",
    )
    expect(normalizePluginName("file:///tmp/repo/packages/kilo-indexing/src/index.ts")).toBe("@qronos-ai/kilo-indexing")
  })

  test("detects supported indexing plugin specifiers", () => {
    const values = [
      "kilo-indexing",
      "kilo-indexing@1.2.3",
      "@qronos-ai/kilo-indexing",
      "@qronos-ai/kilo-indexing@1.2.3",
      "../../packages/kilo-indexing",
      "file:///tmp/.opencode/plugin/kilo-indexing.js",
      "file:///tmp/node_modules/@qronos-ai/kilo-indexing/index.js",
      "file:///tmp/repo/packages/kilo-indexing/src/index.ts",
    ]

    for (const value of values) {
      expect(isIndexingPlugin(value)).toBe(true)
    }
  })

  test("ignores unrelated plugin specifiers", () => {
    expect(isIndexingPlugin("@qronos-ai/kilo-gateway")).toBe(false)
    expect(isIndexingPlugin("file:///tmp/.opencode/plugin/index.js")).toBe(false)
    expect(hasIndexingPlugin(["@qronos-ai/kilo-gateway", "foo@1.0.0"])).toBe(false)
  })

  test("detects indexing plugin in merged plugin lists", () => {
    expect(
      hasIndexingPlugin(["@qronos-ai/kilo-gateway", "file:///tmp/node_modules/@qronos-ai/kilo-indexing/index.js"]),
    ).toBe(true)
  })
})

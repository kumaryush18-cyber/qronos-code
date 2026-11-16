import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { hasIndexingPlugin, isIndexingPlugin, normalizePluginName } from "../../../src/detect"

describe("indexing plugin detection", () => {
  test("bundles detect module for browser targets", async () => {
    const dir = await mkdtemp(`${tmpdir()}/qronos-indexing-detect-`)
    const result = await Bun.build({
      entrypoints: [fileURLToPath(new URL("../../../src/detect.ts", import.meta.url))],
      minify: true,
      outdir: dir,
      target: "browser",
    })

    expect(result.success).toBe(true)
  })

  test("normalizes supported plugin forms", () => {
    expect(normalizePluginName("indexing")).toBe("indexing")
    expect(normalizePluginName("qronos-indexing@1.2.3")).toBe("indexing")
    expect(normalizePluginName("@qronos-ai/indexing")).toBe("@qronos-ai/indexing")
    expect(normalizePluginName("@qronos-ai/indexing@1.2.3")).toBe("@qronos-ai/indexing")
    expect(normalizePluginName("../../packages/indexing")).toBe("@qronos-ai/indexing")
    expect(normalizePluginName("file:///tmp/.opencode/plugin/qronos-indexing.js")).toBe("indexing")
    expect(normalizePluginName("file:///tmp/node_modules/@qronos-ai/indexing/index.js")).toBe(
      "@qronos-ai/indexing",
    )
    expect(normalizePluginName("file:///tmp/repo/packages/indexing/src/index.ts")).toBe("@qronos-ai/indexing")
  })

  test("detects supported indexing plugin specifiers", () => {
    const values = [
      "indexing",
      "qronos-indexing@1.2.3",
      "@qronos-ai/indexing",
      "@qronos-ai/indexing@1.2.3",
      "../../packages/indexing",
      "file:///tmp/.opencode/plugin/qronos-indexing.js",
      "file:///tmp/node_modules/@qronos-ai/indexing/index.js",
      "file:///tmp/repo/packages/indexing/src/index.ts",
    ]

    for (const value of values) {
      expect(isIndexingPlugin(value)).toBe(true)
    }
  })

  test("ignores unrelated plugin specifiers", () => {
    expect(isIndexingPlugin("@qronos-ai/gateway")).toBe(false)
    expect(isIndexingPlugin("file:///tmp/.opencode/plugin/index.js")).toBe(false)
    expect(hasIndexingPlugin(["@qronos-ai/gateway", "foo@1.0.0"])).toBe(false)
  })

  test("detects indexing plugin in merged plugin lists", () => {
    expect(
      hasIndexingPlugin(["@qronos-ai/gateway", "file:///tmp/node_modules/@qronos-ai/indexing/index.js"]),
    ).toBe(true)
  })
})

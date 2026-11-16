import { describe, expect, test } from "bun:test"
import path from "path"
import { QronosOauthCallbackPage } from "@qronos-ai/core/qronos/oauth/page"

const root = path.join(__dirname, "..", "..")

describe("Qronos OAuth branding", () => {
  test("Codex OAuth browser flow uses Qronos branding", async () => {
    const src = await Bun.file(path.join(root, "src", "plugin", "openai", "codex.ts")).text()

    expect(src).toContain('originator: "qronos"')
    expect(src).toContain('"User-Agent": `qronos/${InstallationVersion}`')
    expect(src).toContain("return to Qronos")
    expect(src).not.toContain('originator: "opencode"')
    expect(src).not.toContain("return to OpenCode")
  })

  test("core OAuth browser flow uses Qronos branding", async () => {
    const src = await Bun.file(path.join(root, "..", "core", "src", "plugin", "provider", "openai.ts")).text()
    const pages = [
      QronosOauthCallbackPage.success({ provider: "ChatGPT" }),
      QronosOauthCallbackPage.error("Denied", { provider: "ChatGPT" }),
    ]

    expect(src).toContain('originator: "qronos"')
    expect(src).toContain('"User-Agent": `qronos/${InstallationVersion}`')
    expect(src).toContain("QronosOauthCallbackPage")
    expect(src).not.toContain('originator: "opencode"')
    for (const page of pages) {
      expect(page).toContain("· Qronos</title>")
      expect(page).toContain('aria-label="Qronos Code"')
      expect(page).toContain('viewBox="0 0 100 100"')
      expect(page).not.toContain("OpenCode")
      expect(page).not.toContain('viewBox="0 0 234 42"')
    }
  })

  test("MCP OAuth callback page uses Qronos branding", async () => {
    const src = await Bun.file(path.join(root, "src", "mcp", "oauth-callback.ts")).text()

    expect(src).toContain("return to Qronos")
    expect(src).not.toContain("return to OpenCode")
  })
})

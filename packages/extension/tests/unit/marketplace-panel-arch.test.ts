import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dir, "../..")
const qronos = fs.readFileSync(path.join(root, "src/QronosProvider.ts"), "utf-8")
const panel = fs.readFileSync(path.join(root, "src/MarketplacePanelProvider.ts"), "utf-8")
const remove = fs.readFileSync(path.join(root, "src/qronos-provider/remove-config-item.ts"), "utf-8")

describe("standalone Marketplace architecture", () => {
  it("keeps Marketplace webview cases out of QronosProvider", () => {
    for (const type of [
      "fetchMarketplaceData",
      "installMarketplaceItem",
      "removeInstalledMarketplaceItem",
      "dismissAgentMigrationBanner",
    ]) {
      expect(qronos).not.toContain(`case \"${type}\"`)
      expect(panel).toContain(`case \"${type}\"`)
    }
  })

  it("uses a dedicated Marketplace webview bundle", () => {
    expect(panel).toContain('"dist", "marketplace.js"')
    expect(panel).not.toContain('"dist", "webview.js"')
  })

  it("keeps sidebar removal behind a narrow adapter", () => {
    expect(qronos).toContain("removeMcp(this.removeConfigItemCtx, name)")
    expect(remove).toContain("removeMarketplaceItemFromAllScopes")
    expect(qronos).not.toContain("marketplaceRemove")
    expect(qronos).not.toContain("createMarketplaceRemover")
    expect(remove).not.toContain("MarketplaceInstaller")
    expect(remove).not.toContain("MarketplacePaths")
    expect(remove).not.toContain("new MarketplaceService()")
    expect(remove).not.toContain("AgentMarketplaceItem")
    expect(remove).not.toContain("McpMarketplaceItem")
  })

  it("broadcasts MCP removals from Marketplace to every Qronos provider", () => {
    expect(panel).toContain("mcpRemoval(this.connection)")
    expect(panel).toContain('phase: "installed"')
    expect(panel).toContain('event.phase === "removed" || event.phase === "installed"')
    expect(qronos).toContain("mcpRemoval(this.connectionService).on")
    expect(qronos).toContain('type: "mcpRemoved"')
    expect(qronos).toContain('type: "mcpRemovalState"')
  })

  it("invalidates Agent Behaviour tabs after cross-provider config changes", () => {
    expect(qronos).toContain('type: "agentBehaviourInvalidated"')
    expect(qronos).toContain('event.type === "server.instance.disposed"')
    expect(qronos).toContain('event.type === "global.config.updated"')
  })
})

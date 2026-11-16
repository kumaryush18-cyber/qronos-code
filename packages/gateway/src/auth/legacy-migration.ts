/**
 * Legacy Qronos CLI migration module
 *
 * Migrates authentication from the legacy Qronos Code VS Code extension CLI
 * config path (~/.qronos/cli/config.json) to the new auth.json format.
 */
import fs from "fs/promises"
import os from "os"
import path from "path"

export const LEGACY_CONFIG_PATH = path.join(os.homedir(), ".qronos", "cli", "config.json")

interface LegacyProvider {
  id: string
  provider: string
  qronosToken?: string
  qronosModel?: string
  qronosOrganizationId?: string
}

interface LegacyConfig {
  providers?: LegacyProvider[]
}

interface LegacyQronosAuth {
  token: string
  organizationId?: string
}

// Auth info types matching opencode's Auth module
type ApiAuth = { type: "api"; key: string }
type OAuthAuth = { type: "oauth"; access: string; refresh: string; expires: number; accountId?: string }
type AuthInfo = ApiAuth | OAuthAuth

/**
 * Extract qronos auth from legacy config
 */
function extractQronosAuth(config: LegacyConfig): LegacyQronosAuth | undefined {
  if (!config.providers) return undefined

  const provider = config.providers.find((p) => p.provider === "qronos")
  if (!provider?.qronosToken) return undefined

  return {
    token: provider.qronosToken,
    organizationId: provider.qronosOrganizationId,
  }
}

/**
 * Migrate Qronos authentication from legacy CLI config path.
 *
 * Checks ~/.qronos/cli/config.json for existing qronos credentials
 * and migrates them to the new auth.json format.
 *
 * @param hasQronosAuth - Callback to check if qronos auth already exists
 * @param saveQronosAuth - Callback to save the migrated auth
 * @returns true if migration was performed, false otherwise
 */
export async function migrateLegacyQronosAuth(
  hasQronosAuth: () => Promise<boolean>,
  saveQronosAuth: (auth: AuthInfo) => Promise<void>,
): Promise<boolean> {
  // Skip if qronos auth already configured
  if (await hasQronosAuth()) return false

  // Check if legacy config exists and parse it
  const content = await fs.readFile(LEGACY_CONFIG_PATH, "utf-8").catch(() => null)
  if (!content) return false

  let config: LegacyConfig | null = null
  try {
    config = JSON.parse(content) as LegacyConfig
  } catch {
    return false
  }

  // Extract qronos auth from legacy config
  const legacy = extractQronosAuth(config)
  if (!legacy) return false

  // Migrate to new format
  // Use OAuth format if organization ID present, otherwise API format
  if (legacy.organizationId) {
    await saveQronosAuth({
      type: "oauth",
      access: legacy.token,
      refresh: "",
      expires: 0,
      accountId: legacy.organizationId,
    })
  } else {
    await saveQronosAuth({
      type: "api",
      key: legacy.token,
    })
  }

  return true
}

/**
 * Parse KiloCode URL from token
 * Some tokens contain encoded base URL information
 */
export function getKiloUrlFromToken(defaultUrl: string, token: string): string {
  // If token contains URL information, extract it
  if (!token) return defaultUrl

  const match = token.match(/^(https?:\/\/[^:]+(?::\d+)?(?:\/[^:]*)?):/)
  if (!match) return defaultUrl

  try {
    return new URL(match[1]).toString().replace(/\/+$/, "")
  } catch {
    return defaultUrl
  }
}

/**
 * Validate KiloCode token format
 */
export function isValidKilocodeToken(token: string): boolean {
  if (!token || typeof token !== "string") return false

  // Basic validation - adjust based on actual token requirements
  return token.length > 10
}

/**
 * Get API key from options or environment
 */
export function getApiKey(options: { kilocodeToken?: string; apiKey?: string }): string | undefined {
  if (options.kilocodeToken) return options.kilocodeToken
  if (options.apiKey && options.apiKey !== "anonymous") return options.apiKey
  if (process.env.QRONOS_API_KEY) return process.env.QRONOS_API_KEY
  if (process.env.KILO_API_KEY) return process.env.KILO_API_KEY
  try {
    const fs = require("fs")
    const path = require("path")
    const os = require("os")
    const authPath = path.join(os.homedir(), ".local", "share", "qronos", "auth.json")
    if (fs.existsSync(authPath)) {
      const data = JSON.parse(fs.readFileSync(authPath, "utf8"))
      const key = data.qronos?.key || data.kilo?.key
      if (key) return key
    }
  } catch {}
  return options.apiKey
}

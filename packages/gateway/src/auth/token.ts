/**
 * Parse QronosCode URL from token
 * Some tokens contain encoded base URL information
 */
export function getQronosUrlFromToken(defaultUrl: string, token: string): string {
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
 * Validate QronosCode token format
 */
export function isValidQronosToken(token: string): boolean {
  if (!token || typeof token !== "string") return false

  // Basic validation - adjust based on actual token requirements
  return token.length > 10
}

/**
 * Get API key from options or environment
 */
export function getApiKey(options: { qronosToken?: string; apiKey?: string }): string | undefined {
  if (options.qronosToken) return options.qronosToken
  if (options.apiKey && options.apiKey !== "anonymous") return options.apiKey
  if (process.env.QRONOS_API_KEY) return process.env.QRONOS_API_KEY
  try {
    const fs = require("fs")
    const path = require("path")
    const os = require("os")
    const authPath = path.join(os.homedir(), ".local", "share", "qronos", "auth.json")
    if (fs.existsSync(authPath)) {
      const data = JSON.parse(fs.readFileSync(authPath, "utf8"))
      const key = data.qronos?.key || data.qronos?.key
      if (key) return key
    }
  } catch {}
  return options.apiKey
}

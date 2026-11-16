import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { Provider as SDK } from "ai"
import type { QronosProviderOptions } from "./types.js"
import { getApiKey } from "./auth/token.js"
import { buildQronosHeaders, getDefaultHeaders } from "./headers.js"
import { ANONYMOUS_API_KEY } from "./api/constants.js"
import { resolveQronosOpenRouterBaseUrl } from "./api/url.js"
import { buildRequestHeaders } from "./provider.js"

/**
 * Debug version of createQronos with extensive logging
 */
export function createQronosDebug(options: QronosProviderOptions = {}): SDK {
  console.log("\n🔍 [QRONOS DEBUG] Creating Qronos Provider")
  console.log("📋 [QRONOS DEBUG] Options received:", JSON.stringify(options, null, 2))

  // Get API key from options or environment
  const apiKey = getApiKey(options)
  console.log("🔑 [QRONOS DEBUG] API Key extracted:")
  console.log("  - Source:", options.qronosToken ? "qronosToken" : options.apiKey ? "apiKey" : "none")
  console.log("  - Value:", apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}` : "MISSING!")

  const openRouterUrl = resolveQronosOpenRouterBaseUrl({ baseURL: options.baseURL, token: apiKey })
  console.log("🔗 [QRONOS DEBUG] OpenRouter URL:", openRouterUrl)

  // Merge custom headers with defaults
  const customHeaders = {
    ...getDefaultHeaders(),
    ...buildQronosHeaders(undefined, {
      qronosOrganizationId: options.qronosOrganizationId,
      qronosTesterWarningsDisabledUntil: undefined,
    }),
    ...options.headers,
  }
  console.log("📝 [QRONOS DEBUG] Custom headers:", JSON.stringify(customHeaders, null, 2))

  // Create custom fetch wrapper to add dynamic headers
  const originalFetch = options.fetch ?? fetch
  const wrappedFetch = async (input: string | URL | Request, init?: RequestInit) => {
    console.log("\n🚀 [QRONOS DEBUG] Making request:")
    console.log("  - URL:", String(input))
    console.log("  - Method:", init?.method || "GET")

    const headers = buildRequestHeaders(customHeaders, init?.headers)

    // Add authorization if API key exists
    if (apiKey) {
      const authValue = `Bearer ${apiKey}`
      headers.set("Authorization", authValue)
      console.log(
        "  - Authorization header set:",
        `Bearer ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`,
      )
    } else {
      console.log("  ⚠️ - NO AUTHORIZATION HEADER! API key is missing")
    }

    console.log("  - Headers being sent:")
    headers.forEach((value, key) => {
      if (key.toLowerCase() === "authorization") {
        console.log(`    ${key}: ${value.substring(0, 20)}...`)
      } else {
        console.log(`    ${key}: ${value}`)
      }
    })

    const response = await originalFetch(input, {
      ...init,
      headers,
    })

    console.log("  - Response status:", response.status, response.statusText)

    if (!response.ok) {
      const responseText = await response.text()
      console.log("  ❌ - Error response:", responseText)
      // Re-create response since we consumed the body
      return new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }

    return response
  }

  console.log("✅ [QRONOS DEBUG] Creating OpenRouter provider with configuration\n")

  // Create OpenRouter provider with QronosCode configuration
  return createOpenRouter({
    baseURL: openRouterUrl,
    apiKey: apiKey ?? ANONYMOUS_API_KEY,
    headers: customHeaders,
    fetch: wrappedFetch as typeof fetch,
  }) as unknown as SDK
}

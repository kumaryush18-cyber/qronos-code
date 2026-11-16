/**
 * Qronos Gateway Configuration Constants
 * Centralized configuration for all API endpoints, headers, and settings
 *
 * qronos_change - Two different roots are needed and must not be confused:
 *   REST root   : https://api.qronos.me        -> `${root}/api/profile`, `/api/device-auth/codes`, ...
 *   Gateway root: https://api.qronos.me/v1     -> `${root}/chat/completions`, `/models`, `/fim/completions`, ...
 * Putting `/v1` into the REST root makes every REST call 404.
 */

/** Environment variable for custom Qronos/Qronos REST URL */
export const ENV_QRONOS_API_URL = "QRONOS_API_URL"
export const LEGACY_ENV_QRONOS_API_URL = "QRONOS_API_URL"

/** Default Qronos REST root - no `/v1`, REST paths are appended after `/api`. */
export const DEFAULT_QRONOS_API_URL = "https://api.qronos.me"

/** REST base URL - overridable by QRONOS_API_URL, then the legacy QRONOS_API_URL */
export const QRONOS_API_BASE =
  process.env[ENV_QRONOS_API_URL] || process.env[LEGACY_ENV_QRONOS_API_URL] || DEFAULT_QRONOS_API_URL

/** Environment variable for a custom Qronos AI Gateway URL (gateway traffic only) */
export const ENV_QRONOS_AI_GATEWAY_URL = "QRONOS_AI_GATEWAY_URL"
/** Legacy environment variable, still honoured so existing dev/e2e setups keep working */
export const LEGACY_ENV_QRONOS_AI_GATEWAY_URL = "QRONOS_AI_GATEWAY_URL"

/** Default Qronos AI Gateway URL - keeps `/v1`, OpenAI-compatible traffic only */
export const DEFAULT_QRONOS_AI_GATEWAY_URL = "https://api.qronos.me/v1"

/**
 * Resolve the base URL for AI gateway traffic (chat, models, embeddings, FIM, ...).
 *
 * Precedence: QRONOS_AI_GATEWAY_URL, then the legacy QRONOS_AI_GATEWAY_URL, then
 * `${QRONOS_API_URL}/api/gateway/v1` when only a REST override is set, then the
 * default Qronos AI gateway.
 */
export function resolveQronosAiGatewayBase(env: Readonly<Record<string, string | undefined>> = process.env) {
  const value = env[ENV_QRONOS_AI_GATEWAY_URL]?.trim() || env[LEGACY_ENV_QRONOS_AI_GATEWAY_URL]?.trim()
  if (value) return value.replace(/\/+$/, "")
  const api = (env[ENV_QRONOS_API_URL] ?? env[LEGACY_ENV_QRONOS_API_URL])?.trim()
  if (api) return `${api.replace(/\/+$/, "")}/api/gateway/v1`
  return DEFAULT_QRONOS_AI_GATEWAY_URL
}

/** Base URL for AI gateway traffic */
export const QRONOS_AI_GATEWAY_BASE = resolveQronosAiGatewayBase()

/** Environment variable for the public auto-routing worker URL */
export const ENV_QRONOS_AUTO_ROUTING_URL = "QRONOS_AUTO_ROUTING_URL"

/**
 * qronos_change - Previously `https://auto-routing.qronosapps.io` (Qronos infrastructure).
 * Auto-routing is not offered by Qronos, so requests now stay on the Qronos REST root
 * and fail cleanly there instead of contacting a third party with the user's token.
 */
export const DEFAULT_QRONOS_AUTO_ROUTING_URL = "https://api.qronos.me"

/** Base URL for the public auto-routing worker - can be overridden by QRONOS_AUTO_ROUTING_URL env var */
export const QRONOS_AUTO_ROUTING_BASE = resolveQronosAutoRoutingBase()

/**
 * Resolve the public auto-routing worker base URL. The trailing slash is
 * trimmed so callers can join paths with a leading slash.
 */
export function resolveQronosAutoRoutingBase(env: Readonly<Record<string, string | undefined>> = process.env) {
  return (env[ENV_QRONOS_AUTO_ROUTING_URL] || DEFAULT_QRONOS_AUTO_ROUTING_URL).replace(/\/+$/, "")
}

/** Environment variable for custom Event Service URL */
export const QRONOS_EVENT_SERVICE_URL_ENV = "EVENT_SERVICE_URL"

/**
 * qronos_change - Previously `wss://events.qronosapps.io` (Qronos infrastructure).
 * Qronos has no presence service, so the default is intentionally empty: the
 * presence client disables itself when no URL is configured, which avoids
 * connecting a Qronos user's session to a Qronos server. Set EVENT_SERVICE_URL to
 * enable it against your own host.
 */
export const QRONOS_DEFAULT_EVENT_SERVICE_URL = ""

/** Base URL for Event Service - can be overridden by EVENT_SERVICE_URL env var */
export const QRONOS_EVENT_SERVICE_URL = process.env[QRONOS_EVENT_SERVICE_URL_ENV] || QRONOS_DEFAULT_EVENT_SERVICE_URL

/** Default base URL for the OpenRouter-compatible endpoint (chat, responses, messages, models) */
export const QRONOS_OPENROUTER_BASE = QRONOS_AI_GATEWAY_BASE

/** Device auth polling interval in milliseconds */
export const POLL_INTERVAL_MS = 3000

/** Default model for authenticated users */
export const DEFAULT_MODEL = "claude-5.5-sonnet"

/** Default model for anonymous/free usage */
export const DEFAULT_FREE_MODEL = "deepseek-v4-flash"

/** Token expiration duration in milliseconds (1 year) */
export const TOKEN_EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000

/** User-Agent header base value for requests */
export const USER_AGENT_BASE = "opencode-qronos-provider"

/** Content-Type header value for requests */
export const CONTENT_TYPE = "application/json"

/** Default provider name */
export const DEFAULT_PROVIDER_NAME = "qronos"

/** Default API key for anonymous requests */
export const ANONYMOUS_API_KEY = "anonymous"

/** Fetch timeout for model requests in milliseconds (10 seconds) */
export const MODELS_FETCH_TIMEOUT_MS = 10 * 1000

/**
 * Header constants for QronosCode API requests
 */
export const HEADER_ORGANIZATIONID = "X-QRONOS-ORGANIZATIONID"
export const HEADER_TASKID = "X-QRONOS-TASKID"
export const HEADER_PARENT_TASKID = "X-QRONOS-PARENT-TASKID"
export const HEADER_PROJECTID = "X-QRONOS-PROJECTID"
export const HEADER_TESTER = "X-QRONOS-TESTER"
export const HEADER_EDITORNAME = "X-QRONOS-EDITORNAME"
export const HEADER_MACHINEID = "X-QRONOS-MACHINEID"

/** Default editor name value */
export const DEFAULT_EDITOR_NAME = "Qronos CLI"

/** Environment variable name for custom editor name */
export const ENV_EDITOR_NAME = "QRONOS_EDITOR_NAME"

/** Environment variable name for version (set by CLI at startup) */
export const ENV_VERSION = "QRONOS_VERSION"

/** Tester header value for suppressing warnings */
export const TESTER_SUPPRESS_VALUE = "SUPPRESS"

/** Header name for feature tracking */
export const HEADER_FEATURE = "X-QRONOS-FEATURE"

/** Environment variable name for feature override */
export const ENV_FEATURE = "QRONOS_FEATURE"

export const PROMPTS = [
  "codex",
  "gemini",
  "beast",
  "anthropic",
  "trinity",
  "anthropic_without_todo",
  "ling",
  "gpt55",
] as const

export const AI_SDK_PROVIDERS = [
  "anthropic",
  "openai",
  "openai-compatible",
  "openrouter",
] as const

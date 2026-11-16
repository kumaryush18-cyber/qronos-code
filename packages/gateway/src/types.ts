import type { LanguageModel, Provider, Provider as SDK } from "ai"
import type { LanguageModelV3 } from "@openrouter/ai-sdk-provider"

// ============================================================================
// Authentication Types
// ============================================================================

export interface DeviceAuthInitiateResponse {
  code: string
  verificationUrl: string
  expiresIn: number
}

export interface DeviceAuthPollResponse {
  status: "pending" | "approved" | "denied" | "expired"
  token?: string
  userEmail?: string
}

export interface Organization {
  id: string
  name: string
  role: string
}

export interface QronosProfile {
  email: string
  name?: string
  organizations?: Organization[]
  selectedOrganizationId?: string
  hasPersonalAccount?: boolean
}

export interface QronosBalance {
  balance: number
}

export interface QronosPassState {
  currentPeriodBaseCreditsUsd: number
  currentPeriodUsageUsd: number
  currentPeriodBonusCreditsUsd: number
  nextBillingAt?: string | null
}

export interface PollOptions<T> {
  interval: number
  maxAttempts: number
  pollFn: () => Promise<PollResult<T>>
}

export interface PollResult<T> {
  continue: boolean
  data?: T
  error?: Error
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Options for creating a Qronos provider instance
 */
export interface QronosProviderOptions {
  /**
   * QronosCode authentication token
   */
  qronosToken?: string

  /**
   * Organization ID for multi-tenant setups
   */
  qronosOrganizationId?: string

  /**
   * Model ID to use (e.g., "anthropic/claude-sonnet-4")
   */
  qronosModel?: string

  /**
   * Specific OpenRouter provider to use
   */
  openRouterSpecificProvider?: string

  /**
   * Base URL for Qronos Gateway traffic
   * Defaults to QRONOS_AI_GATEWAY_URL, or `${QRONOS_API_URL}/api/gateway/v1` when only QRONOS_API_URL is set
   * @default "https://ai-gateway.qronos.ai/api/v1"
   */
  baseURL?: string

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>

  /**
   * API key (alternative to qronosToken)
   */
  apiKey?: string

  /**
   * Provider name for identification
   */
  name?: string

  /**
   * Data collection preference for upstream provider routing
   */
  dataCollection?: "allow" | "deny"

  /**
   * Custom fetch function
   */
  fetch?: typeof fetch

  /**
   * Request timeout in milliseconds
   */
  timeout?: number | false
}

/**
 * Metadata for API requests
 */
export interface QronosMetadata {
  /**
   * Task ID for tracking
   */
  taskId?: string

  /**
   * Project ID for organization tracking
   */
  projectId?: string

  /**
   * Mode of operation (e.g., "code", "chat")
   */
  mode?: string
}

/**
 * Custom loader return type
 */
export interface CustomLoaderResult {
  /**
   * Whether to automatically load this provider
   */
  autoload: boolean

  /**
   * Custom function to get a model instance
   */
  getModel?: (sdk: SDK, modelID: string, options?: Record<string, any>) => Promise<LanguageModelV3>

  /**
   * Options to merge with provider configuration
   */
  options?: Record<string, any>
}

/**
 * Provider info type (minimal definition needed for loader)
 */
export interface ProviderInfo {
  id: string
  name: string
  source: "env" | "config" | "custom" | "api"
  env: string[]
  key?: string
  options: Record<string, any>
  models: Record<string, any>
}

export type QronosProvider = Provider & {
  anthropic(modelId: string): LanguageModel
  openai(modelId: string): LanguageModel
  openaiCompatible(modelId: string): LanguageModel
}

// Re-export LanguageModelV3 for convenience
export type { LanguageModelV3 }
